"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const fs = require("fs-extra");
const path = require("path");
const utils_1 = require("../utils");
const debugLog_1 = require("../debugLog");
const templates_1 = require("../templates");
class FileStructures {
    constructor(generators, usingMultipleOrigins, surrounding = utils_1.Surrounding.typeScript, baseDir = 'src/service', templateType = '') {
        this.generators = generators;
        this.usingMultipleOrigins = usingMultipleOrigins;
        this.surrounding = surrounding;
        this.baseDir = baseDir;
        this.templateType = templateType;
    }
    getMultipleOriginsFileStructures() {
        const files = {};
        this.generators.filter(generator => generator.outDir === this.baseDir).forEach(generator => {
            const dsName = generator.dataSource.name;
            const dsFiles = this.getOriginFileStructures(generator, true);
            files[dsName] = dsFiles;
        });
        return Object.assign(Object.assign({}, files), { [utils_1.getFileName('index', this.surrounding)]: this.getDataSourcesTs.bind(this), 'api.d.ts': this.getDataSourcesDeclarationTs.bind(this), 'api-lock.json': this.getLockContent.bind(this) });
    }
    getBaseClassesInDeclaration(originCode, usingMultipleOrigins) {
        if (usingMultipleOrigins) {
            return `
      declare namespace defs {
        export ${originCode}
      };
      `;
        }
        return `
      declare ${originCode}
    `;
    }
    getModsDeclaration(originCode, usingMultipleOrigins) {
        if (usingMultipleOrigins) {
            return `
      declare namespace API {
        export ${originCode}
      };
      `;
        }
        return `
      declare ${originCode}
    `;
    }
    getOriginFileStructures(generator, usingMultipleOrigins = false) {
        let mods = {};
        const dataSource = generator.dataSource;
        const indexFileName = utils_1.getFileName('index', this.surrounding);
        dataSource.mods.forEach(mod => {
            const currMod = {};
            mod.interfaces.forEach(inter => {
                currMod[utils_1.getFileName(inter.name, this.surrounding)] = generator.getInterfaceContent.bind(generator, inter);
                currMod[indexFileName] = generator.getModIndex.bind(generator, mod);
            });
            const modName = utils_1.reviseModName(mod.name);
            mods[modName] = currMod;
            mods[indexFileName] = generator.getModsIndex.bind(generator);
        });
        if (!generator.hasContextBund) {
            generator.getBaseClassesInDeclaration = this.getBaseClassesInDeclaration.bind(this, generator.getBaseClassesInDeclaration(), usingMultipleOrigins);
            generator.getModsDeclaration = this.getModsDeclaration.bind(this, generator.getModsDeclaration(), usingMultipleOrigins);
            generator.hasContextBund = true;
        }
        const result = {
            [utils_1.getFileName('baseClass', this.surrounding)]: generator.getBaseClassesIndex.bind(generator),
            mods: mods,
            [indexFileName]: generator.getIndex.bind(generator),
            'api.d.ts': generator.getDeclaration.bind(generator)
        };
        if (!usingMultipleOrigins) {
            result['api-lock.json'] = this.getLockContent.bind(this);
        }
        return result;
    }
    getFileStructures() {
        const result = this.usingMultipleOrigins || this.generators.length > 1
            ? this.getMultipleOriginsFileStructures()
            : this.getOriginFileStructures(this.generators[0]);
        if (this.surrounding === utils_1.Surrounding.javaScript) {
            if (!fs.existsSync(this.baseDir + '/pontCore.js')) {
                result['pontCore.js'] = utils_1.getTemplatesDirFile('pontCore.js', 'pontCore/');
                result['pontCore.d.ts'] = utils_1.getTemplatesDirFile('pontCore.d.ts', 'pontCore/');
            }
            if (this.templateType && this.checkHasTemplateFetch()) {
                result[`${this.templateType}.js`] = utils_1.getTemplatesDirFile(`${this.templateType}.js`, 'pontCore/');
                result[`${this.templateType}.d.ts`] = utils_1.getTemplatesDirFile(`${this.templateType}.d.ts`, 'pontCore/');
            }
        }
        return result;
    }
    checkHasTemplateFetch() {
        const templateTypesWithOutFetch = templates_1.templateRegistion.map(item => item.templateType).filter(item => item !== 'fetch');
        if (templateTypesWithOutFetch.includes(this.templateType) &&
            utils_1.judgeTemplatesDirFileExists(`${this.templateType}.js`, 'pontCore/')) {
            return true;
        }
        return false;
    }
    getMultipleOriginsDataSourceName() {
        const dsNames = this.generators.map(ge => ge.dataSource.name);
        if (this.judgeHasMultipleFilesName()) {
            const generate = this.generators.find(ge => ge.outDir === this.baseDir);
            if (generate) {
                return [generate.dataSource.name];
            }
        }
        return dsNames;
    }
    judgeHasMultipleFilesName() {
        return this.generators.some(generate => {
            return generate.outDir !== this.baseDir;
        });
    }
    getDataSourcesTs() {
        const dsNames = this.getMultipleOriginsDataSourceName();
        const generatedCode = this.surrounding === utils_1.Surrounding.typeScript ? '(window as any)' : 'window';
        return `
      ${dsNames
            .map(name => {
            return `import { defs as ${name}Defs, ${name} } from './${name}';
          `;
        })
            .join('\n')}

      ${generatedCode}.defs = {
        ${dsNames.map(name => `${name}: ${name}Defs,`).join('\n')}
      };
      ${generatedCode}.API = {
        ${dsNames.join(',\n')}
      };
    `;
    }
    getDataSourcesDeclarationTs() {
        const dsNames = this.getMultipleOriginsDataSourceName();
        return `
    ${dsNames
            .map(name => {
            return `/// <reference path="./${name}/api.d.ts" />`;
        })
            .join('\n')}
    `;
    }
    getLockContent() {
        if (this.generators) {
            const hasMultipleOutDir = this.generators.some(generate => {
                return generate.outDir !== this.baseDir;
            });
            let dataSources;
            if (this.generators.length > 1 && hasMultipleOutDir) {
                dataSources = this.generators.filter(item => item.outDir === this.baseDir).map(ge => ge.dataSource);
            }
            else {
                dataSources = this.generators.map(ge => ge.dataSource);
            }
            return JSON.stringify(dataSources, null, 2);
        }
    }
}
exports.FileStructures = FileStructures;
class CodeGenerator {
    constructor(surrounding = utils_1.Surrounding.typeScript, outDir = '') {
        this.surrounding = surrounding;
        this.outDir = outDir;
        this.usingMultipleOrigins = false;
        this.hasContextBund = false;
    }
    setDataSource(dataSource) {
        this.dataSource = dataSource;
        this.dataSource.name = _.camelCase(this.dataSource.name);
    }
    getBaseClassInDeclaration(base) {
        if (base.templateArgs && base.templateArgs.length) {
            return `class ${base.name}<${base.templateArgs.map((_, index) => `T${index} = any`).join(', ')}> {
        ${base.properties.map(prop => prop.toPropertyCode(utils_1.Surrounding.typeScript, true)).join('\n')}
      }
      `;
        }
        return `class ${base.name} {
      ${base.properties.map(prop => prop.toPropertyCode(utils_1.Surrounding.typeScript, true)).join('\n')}
    }
    `;
    }
    getBaseClassesInDeclaration() {
        const content = `namespace ${this.dataSource.name || 'defs'} {
      ${this.dataSource.baseClasses
            .map(base => `
        export ${this.getBaseClassInDeclaration(base)}
      `)
            .join('\n')}
    }
    `;
        return content;
    }
    getBaseClassesInDeclarationWithMultipleOrigins() {
        return `
      declare namespace defs {
        export ${this.getBaseClassesInDeclaration()}
      }
    `;
    }
    getBaseClassesInDeclarationWithSingleOrigin() {
        return `
      declare ${this.getBaseClassesInDeclaration()}
    `;
    }
    getInterfaceContentInDeclaration(inter) {
        const bodyParams = inter.getBodyParamsCode();
        const requestParams = bodyParams ? `params: Params, bodyParams: ${bodyParams}` : `params: Params`;
        return `
      export ${inter.getParamsCode('Params', this.surrounding)}

      export type Response = ${inter.responseType};
      export const init: Response;
      export function request(${requestParams}): Promise<${inter.responseType}>;
    `;
    }
    getInterfaceInDeclaration(inter) {
        return `
      /**
        * ${inter.description}
        * ${inter.path}
        */
      export namespace ${inter.name} {
        ${this.getInterfaceContentInDeclaration(inter)}
      }
    `;
    }
    getModsDeclaration() {
        const mods = this.dataSource.mods;
        const content = `namespace ${this.dataSource.name || 'API'} {
        ${mods
            .map(mod => `
          /**
           * ${mod.description}
           */
          export namespace ${utils_1.reviseModName(mod.name)} {
            ${mod.interfaces.map(this.getInterfaceInDeclaration.bind(this)).join('\n')}
          }
        `)
            .join('\n\n')}
      }
    `;
        return content;
    }
    getModsDeclarationWithMultipleOrigins() { }
    getModsDeclarationWithSingleOrigin() { }
    getCommonDeclaration() {
        return '';
    }
    getDeclaration() {
        return `
      type ObjectMap<Key extends string | number | symbol = any, Value = any> = {
        [key in Key]: Value;
      }

      ${this.getCommonDeclaration()}

      ${this.getBaseClassesInDeclaration()}

      ${this.getModsDeclaration()}
    `;
    }
    getIndex() {

        const compatible = `type Any = any

        declare global {
          interface RequestVo extends Any {}
          interface RequestVO extends Any {}
          interface MoveRequestVO extends Any {}
        }
        
        declare global {
          interface BeiSenVO extends Any {}
          interface ApproveRequestVO extends Any {}
          interface RequestParamVO extends Any {}
          interface QueryRequestVO extends Any {}
          interface PerformanceRequestVO extends Any {}
          interface CommonVO extends Any {}
          interface headCountRequestVO extends Any {}
          interface EvaluationVO extends Any {}
          interface DepartmentRequestVO extends Any {}
          interface DimissionRequestVO extends Any {}
          interface TokenVO extends Any {}
          interface EmployeeRequestVO extends Any {}
        }`

        let conclusion = `
      import * as defs from './baseClass';
      import './mods/';
      ${compatible}

      ${this.surrounding === utils_1.Surrounding.typeScript ? '(window as any)' : 'window'}.defs = defs;
    `;
        if (this.dataSource.name) {
            conclusion = `
        import { ${this.dataSource.name} as defs } from './baseClass';
        export { ${this.dataSource.name} } from './mods/';
        export { defs };
        ${compatible}
      `;
        }
        return conclusion;
    }
    getBaseClassesIndex() {
        const clsCodes = this.dataSource.baseClasses.map(base => `
        class ${base.name} {
          ${base.properties
            .map(prop => {
            return prop.toPropertyCodeWithInitValue(base.name);
        })
            .filter(id => id)
            .join('\n')}
        }
      `);
        if (this.dataSource.name) {
            return `
        ${clsCodes.join('\n')}
        export const ${this.dataSource.name} = {
          ${this.dataSource.baseClasses.map(bs => bs.name).join(',\n')}
        }
      `;
        }
        return clsCodes.map(cls => `export ${cls}`).join('\n');
    }
    getInterfaceContent(inter) {
        const method = inter.method.toUpperCase();
        const bodyParams = inter.getBodyParamsCode();
        return `
    /**
     * @desc ${inter.description}
     */

    import * as defs from '../../baseClass';
    import { pontCore } from '../../pontCore';

    export ${inter.getParamsCode('Params', this.surrounding)}

    export const init = ${inter.response.getInitialValue()};

    export function request(${bodyParams ? `params = {}, bodyParams = null` : 'params = {}'}) {

      return pontCore.fetch(pontCore.getUrl("${inter.path}", params, "${method}"), {
        method: "${method}",
        body: ${bodyParams ? 'bodyParams' : 'null'},
      });
    }
   `;
    }
    getModIndex(mod) {
        return `
      /**
       * @description ${mod.description}
       */
      ${mod.interfaces
            .map(inter => {
            return `export { ${inter.name} } from './${inter.name}';`;
        })
            .join('\n')}
    `;
    }
    getModsIndex() {
        let conclusion = `
      ${this.surrounding === utils_1.Surrounding.typeScript ? '(window as any)' : 'window'}.API = {
        ${this.dataSource.mods.map(mod => utils_1.reviseModName(mod.name)).join(', \n')}
      };
    `;
        if (this.dataSource.name) {
            conclusion = `
        export const ${this.dataSource.name} = {
          ${this.dataSource.mods.map(mod => utils_1.reviseModName(mod.name)).join(', \n')}
        };
      `;
        }
        return `
      ${this.dataSource.mods
            .map(mod => {
            const modName = utils_1.reviseModName(mod.name);
            return `import * as ${modName} from './${modName}';`;
        })
            .join('\n')}

      ${conclusion}
    `;
    }
    getDataSourceCallback(dataSource) {
        if (dataSource) {
            return;
        }
    }
}
exports.CodeGenerator = CodeGenerator;
class FilesManager {
    constructor(fileStructures, baseDir) {
        this.fileStructures = fileStructures;
        this.baseDir = baseDir;
        this.report = debugLog_1.info;
        this.created = false;
    }
    initPath(path) {
        if (!fs.existsSync(path)) {
            fs.mkdirpSync(path);
        }
    }
    regenerate(files, oldFiles) {
        return __awaiter(this, void 0, void 0, function* () {
            this.initPath(this.baseDir);
            this.created = true;
            if (oldFiles && Object.keys(oldFiles || {}).length) {
                const updateTask = this.diffFiles(files, oldFiles);
                if (updateTask.deletes && updateTask.deletes.length) {
                    this.report(`删除${updateTask.deletes.length}个文件及文件夹`);
                    yield Promise.all(updateTask.deletes.map(filePath => {
                        fs.unlink(filePath);
                    }));
                }
                if (updateTask.updateCnt) {
                    this.report(`更新${updateTask.updateCnt}个文件`);
                    console.time(`更新${updateTask.updateCnt}个文件`);
                    yield this.updateFiles(updateTask.files);
                    console.timeEnd(`更新${updateTask.updateCnt}个文件`);
                }
            }
            else {
                yield this.generateFiles(files);
            }
        });
    }
    saveLock() {
        return __awaiter(this, void 0, void 0, function* () {
            const lockFilePath = path.join(this.baseDir, 'api-lock.json');
            const oldLockFilePath = path.join(this.baseDir, 'api.lock');
            const isExists = fs.existsSync(lockFilePath);
            const readFilePath = isExists ? lockFilePath : oldLockFilePath;
            const lockContent = yield fs.readFile(readFilePath, 'utf8');
            const newLockContent = this.fileStructures.getLockContent();
            if (lockContent !== newLockContent) {
                this.created = true;
                yield fs.writeFile(lockFilePath, newLockContent);
            }
        });
    }
    diffFiles(newFiles, lastFiles, dir = this.baseDir) {
        const task = {
            deletes: [],
            files: {},
            updateCnt: 0
        };
        _.map(lastFiles, (lastValue, name) => {
            const currPath = `${dir}/${name}`;
            const newValue = newFiles[name];
            if (!newValue) {
                task.deletes.push(currPath);
                return;
            }
            if (typeof newValue === 'object' && typeof lastValue === 'string') {
                task.deletes.push(currPath);
                const fileTask = this.diffFiles(newValue, {}, currPath);
                if (fileTask.updateCnt) {
                    task.files = Object.assign(Object.assign(Object.assign({}, task.files), { [currPath]: undefined }), fileTask.files);
                    task.updateCnt += fileTask.updateCnt + 1;
                }
                return;
            }
            if (typeof newValue === 'string' && typeof lastValue === 'object') {
                task.deletes.push(currPath);
                return;
            }
            if (typeof lastValue === 'string') {
                if (newValue !== lastValue) {
                    task.files[currPath] = newValue;
                    task.updateCnt++;
                }
            }
            else {
                const fileTask = this.diffFiles(newValue, lastValue, currPath);
                task.deletes.push(...fileTask.deletes);
                if (fileTask.updateCnt) {
                    task.updateCnt += fileTask.updateCnt;
                    task.files = Object.assign(Object.assign({}, task.files), fileTask.files);
                }
            }
        });
        _.map(newFiles, (newValue, name) => {
            const currPath = `${dir}/${name}`;
            const lastValue = lastFiles[name];
            if (!lastValue) {
                if (typeof newValue === 'string') {
                    task.files[currPath] = newValue;
                    task.updateCnt += 1;
                }
                else {
                    const fileTask = this.diffFiles(newValue, {}, currPath);
                    if (fileTask.updateCnt) {
                        task.updateCnt += fileTask.updateCnt + 1;
                        task.files = Object.assign(Object.assign(Object.assign({}, task.files), { [currPath]: undefined }), fileTask.files);
                    }
                }
            }
        });
        return task;
    }
    formatFile(code, name = '') {
        if (name && name.endsWith('.json')) {
            return code;
        }
        return utils_1.format(code, this.prettierConfig);
    }
    updateFiles(files) {
        return __awaiter(this, void 0, void 0, function* () {
            yield Promise.all(_.map(files, (value, filePath) => __awaiter(this, void 0, void 0, function* () {
                if (value === undefined) {
                    return fs.mkdir(filePath);
                }
                if (filePath.endsWith('.json')) {
                    return fs.writeFile(filePath, value);
                }
                return fs.writeFile(filePath, this.formatFile(value));
            })));
        });
    }
    generateFiles(files, dir = this.baseDir) {
        return __awaiter(this, void 0, void 0, function* () {
            const currFiles = yield fs.readdir(dir);
            const promises = _.map(files, (value, name) => __awaiter(this, void 0, void 0, function* () {
                const currPath = `${dir}/${name}`;
                if (typeof value === 'string') {
                    if (currFiles.includes(name)) {
                        const state = yield fs.lstat(currPath);
                        if (state.isDirectory()) {
                            yield fs.unlink(currPath);
                            return fs.writeFile(currPath, this.formatFile(value, name));
                        }
                        else {
                            const newValue = this.formatFile(value);
                            const currValue = yield fs.readFile(currPath, 'utf8');
                            if (newValue !== currValue) {
                                return fs.writeFile(currPath, this.formatFile(value, name));
                            }
                            return;
                        }
                    }
                    else {
                        return fs.writeFile(currPath, this.formatFile(value, name));
                    }
                }
                if (currFiles.includes(name)) {
                    const state = yield fs.lstat(currPath);
                    if (state.isDirectory()) {
                        return this.generateFiles(files[name], currPath);
                    }
                    else {
                        yield fs.unlink(currPath);
                        yield fs.mkdir(currPath);
                        return this.generateFiles(files[name], currPath);
                    }
                }
                else {
                    yield fs.mkdir(currPath);
                    return this.generateFiles(files[name], currPath);
                }
            }));
            yield Promise.all(promises);
        });
    }
}
exports.FilesManager = FilesManager;
//# sourceMappingURL=generate.js.map