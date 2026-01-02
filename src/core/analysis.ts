
import ts from 'typescript';
import fs from 'fs';
import path from 'path';

export interface SymbolInfo {
  name: string;
  kind: string;
  line: number;
  character: number;
  endLine: number;
  endCharacter: number;
  visibility?: string;
  type?: string;
}

export interface FileSummary {
  path: string;
  classes: SymbolInfo[];
  functions: SymbolInfo[];
  interfaces: SymbolInfo[];
  variables: SymbolInfo[];
  imports: { module: string; default?: string; named?: string[] }[];
  exports: string[];
}

export function analyzeFile(filePath: string): FileSummary {
  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true
  );

  const summary: FileSummary = {
    path: filePath,
    classes: [],
    functions: [],
    interfaces: [],
    variables: [],
    imports: [],
    exports: []
  };

  function getVisibility(node: ts.Node): string {
    const modifiers = (node as any).modifiers;
    if (modifiers) {
      for (const modifier of modifiers) {
        if (modifier.kind === ts.SyntaxKind.ExportKeyword) return 'public';
        if (modifier.kind === ts.SyntaxKind.PrivateKeyword) return 'private';
        if (modifier.kind === ts.SyntaxKind.ProtectedKeyword) return 'protected';
      }
    }
    return 'internal';
  }

  function getPosition(node: ts.Node): { line: number; character: number; endLine: number; endCharacter: number } {
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
    return {
      line: start.line + 1,
      character: start.character + 1,
      endLine: end.line + 1,
      endCharacter: end.character + 1
    };
  }

  function visit(node: ts.Node) {
    // Imports
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = (node.moduleSpecifier as ts.StringLiteral).text;
      const importInfo: { module: string; default?: string; named?: string[] } = { module: moduleSpecifier };

      if (node.importClause) {
        if (node.importClause.name) {
          importInfo.default = node.importClause.name.text;
        }
        if (node.importClause.namedBindings) {
          if (ts.isNamedImports(node.importClause.namedBindings)) {
            importInfo.named = node.importClause.namedBindings.elements.map(e => e.name.text);
          }
        }
      }
      summary.imports.push(importInfo);
    }

    // Classes
    else if (ts.isClassDeclaration(node) && node.name) {
      summary.classes.push({
        name: node.name.text,
        kind: 'class',
        ...getPosition(node),
        visibility: getVisibility(node)
      });
    }

    // Interfaces
    else if (ts.isInterfaceDeclaration(node) && node.name) {
      summary.interfaces.push({
        name: node.name.text,
        kind: 'interface',
        ...getPosition(node),
        visibility: getVisibility(node)
      });
    }

    // Functions
    else if (ts.isFunctionDeclaration(node) && node.name) {
      summary.functions.push({
        name: node.name.text,
        kind: 'function',
        ...getPosition(node),
        visibility: getVisibility(node)
      });
    }

    // Variables (const/let)
    else if (ts.isVariableStatement(node)) {
      const isExported = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
      node.declarationList.declarations.forEach(decl => {
        if (ts.isIdentifier(decl.name)) {
          summary.variables.push({
            name: decl.name.text,
            kind: 'variable',
            ...getPosition(decl),
            visibility: isExported ? 'public' : 'internal'
          });
        }
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return summary;
}
