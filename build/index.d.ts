type StructField = {
    type: string;
    name: string;
    length?: number;
    byteOffset?: number;
};
type StructsMap = Record<string, StructField[]>;
interface InitOptions {
    keys?: string[];
    structs?: StructsMap;
}
declare class VuespStructs {
    #private;
    constructor();
    init({ keys, structs }: InitOptions): void;
    set(key: string, data?: Record<string, unknown>): ArrayBuffer | null | false;
    get(data: ArrayBuffer): {
        object: Record<string, unknown>;
        key: string;
    } | null | false;
    static parseStruct(data: string): unknown;
}
export default VuespStructs;
