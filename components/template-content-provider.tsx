"use client";
import { createContext, useContext, type ReactNode } from "react";
import { templateCopy, templateDefaults } from "@/lib/template-content";
const TemplateContext = createContext<Record<string, Record<string, string>>>({});
export function TemplateContentProvider({ values, children }: { values: Record<string, Record<string, string>>; children: ReactNode }) { return <TemplateContext.Provider value={values}>{children}</TemplateContext.Provider>; }
export function useTemplateCopy(id: string) { const values = useContext(TemplateContext); return templateCopy(values[id] ?? templateDefaults(id)); }
