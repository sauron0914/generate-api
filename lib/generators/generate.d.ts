import { StandardDataSource, Interface, Mod, BaseClass } from '../standard';
import { Surrounding } from '../utils';
import { info } from '../debugLog';
export declare class FileStructures {
    private generators;
    private usingMultipleOrigins;
    private surrounding;
    private baseDir;
    private templateType;
    constructor(generators: CodeGenerator[], usingMultipleOrigins: boolean, surrounding?: Surrounding, baseDir?: string, templateType?: string);
    getMultipleOriginsFileStructures(): {
        'api.d.ts': any;
        'api-lock.json': any;
    };
    getBaseClassesInDeclaration(originCode: string, usingMultipleOrigins: boolean): string;
    getModsDeclaration(originCode: string, usingMultipleOrigins: boolean): string;
    getOriginFileStructures(generator: CodeGenerator, usingMultipleOrigins?: boolean): {
        [x: string]: any;
        mods: {};
        'api.d.ts': any;
    };
    getFileStructures(): {
        'api.d.ts': any;
        'api-lock.json': any;
    } | {
        [x: string]: any;
        mods: {};
        'api.d.ts': any;
    };
    private checkHasTemplateFetch;
    getMultipleOriginsDataSourceName(): string[];
    judgeHasMultipleFilesName(): boolean;
    getDataSourcesTs(): string;
    getDataSourcesDeclarationTs(): string;
    getLockContent(): string;
}
export declare class CodeGenerator {
    surrounding: Surrounding;
    outDir: string;
    usingMultipleOrigins: boolean;
    dataSource: StandardDataSource;
    hasContextBund: boolean;
    constructor(surrounding?: Surrounding, outDir?: string);
    setDataSource(dataSource: StandardDataSource): void;
    getBaseClassInDeclaration(base: BaseClass): string;
    getBaseClassesInDeclaration(): string;
    getBaseClassesInDeclarationWithMultipleOrigins(): string;
    getBaseClassesInDeclarationWithSingleOrigin(): string;
    getInterfaceContentInDeclaration(inter: Interface): string;
    private getInterfaceInDeclaration;
    getModsDeclaration(): string;
    getModsDeclarationWithMultipleOrigins(): void;
    getModsDeclarationWithSingleOrigin(): void;
    getCommonDeclaration(): string;
    getDeclaration(): string;
    getIndex(): string;
    getBaseClassesIndex(): string;
    getInterfaceContent(inter: Interface): string;
    getModIndex(mod: Mod): string;
    getModsIndex(): string;
    getDataSourceCallback(dataSource?: StandardDataSource): void;
}
export declare class FilesManager {
    fileStructures: FileStructures;
    private baseDir;
    report: typeof info;
    prettierConfig: {};
    constructor(fileStructures: FileStructures, baseDir: string);
    private initPath;
    regenerate(files: {}, oldFiles?: {}): Promise<void>;
    created: boolean;
    saveLock(): Promise<void>;
    diffFiles(newFiles: {}, lastFiles: {}, dir?: string): {
        deletes: string[];
        files: {};
        updateCnt: number;
    };
    formatFile(code: string, name?: string): any;
    updateFiles(files: {}): Promise<void>;
    generateFiles(files: {}, dir?: string): Promise<void>;
}
