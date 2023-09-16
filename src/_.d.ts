export type Token  = {
    name?: string;
    type: string;

    isAxis?: boolean;
    isPseudo?: boolean;
    isPseudoRoot?: boolean;
    isTag?: boolean;
    tagContext?: string;
};

export type PseudoDefinitions = Record<string, Function | string>;
