import { LabelHTMLAttributes } from "react";
export const Label = (p: LabelHTMLAttributes<HTMLLabelElement>) => (
    <label {...p} className={"mb-1 block text-xs text-text-muted"} />
);
