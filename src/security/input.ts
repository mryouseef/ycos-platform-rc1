/** M-09 boundary helpers: input is never authority and must be bounded before service dispatch. */
export const boundedId=(value:unknown)=>typeof value==="string"&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/.test(value);
export const boundedVersion=(value:unknown)=>Number.isInteger(Number(value))&&Number(value)>=1&&Number(value)<=1_000_000;
export const boundedTitle=(value:unknown)=>typeof value==="string"&&value.trim().length>0&&value.trim().length<=140&&!/[<>\u0000]/.test(value);
