import {
  resolve,
} from "node:path";

import type {
  FrameworkAdapter,
  ProjectWorkspace,
} from "../../core/inspection/contracts.js";

import type {
  EnvironmentDescriptor,
  FrameworkDescriptor,
  TestCatalog,
} from "../../core/project/model.js";

import {
  readTextIfExists,
} from "../../core/inspection/file-utils.js";

import {
  discoverGherkinTests,
} from "./gherkin-discovery.js";

const descriptor: FrameworkDescriptor = {
  id:
    "serenity",

  displayName:
    "Serenity BDD",

  capabilities: [
    "DISCOVER_TESTS",
    "SELECT_ALL",
    "SELECT_CONTAINER",
    "SELECT_TEST",
    "SELECT_LABEL",
  ],

  vocabulary: {
    container:
      "Feature",

    test:
      "Scenario",

    label:
      "Tag",
  },

  selectors: [
    {
      id:
        "all",

      displayName:
        "All",

      kind:
        "ALL",
    },

    {
      id:
        "container",

      displayName:
        "Feature",

      kind:
        "CONTAINER",
    },

    {
      id:
        "test",

      displayName:
        "Scenario",

      kind:
        "TEST",
    },

    {
      id:
        "label",

      displayName:
        "Tags",

      kind:
        "LABEL",
    },
  ],
};

export class SerenityFrameworkAdapter
  implements FrameworkAdapter {

  async supports(
    workspace: ProjectWorkspace,
  ): Promise<boolean> {

    const sources = [
      await readTextIfExists(
        resolve(
          workspace.root,
          "pom.xml",
        ),
      ),

      await readTextIfExists(
        resolve(
          workspace.root,
          "build.gradle",
        ),
      ),

      await readTextIfExists(
        resolve(
          workspace.root,
          "build.gradle.kts",
        ),
      ),
    ];

    return sources
      .filter(Boolean)
      .some(
        (content) =>
          content
            ?.toLowerCase()
            .includes(
              "serenity",
            ),
      );
  }

  async inspect(
    workspace: ProjectWorkspace,
  ): Promise<FrameworkDescriptor> {

    const sources = [
      await readTextIfExists(
        resolve(
          workspace.root,
          "pom.xml",
        ),
      ),

      await readTextIfExists(
        resolve(
          workspace.root,
          "build.gradle",
        ),
      ),

      await readTextIfExists(
        resolve(
          workspace.root,
          "build.gradle.kts",
        ),
      ),
    ]
      .filter(
        (
          value,
        ): value is string =>
          Boolean(value),
      )
      .join("\n");

    const match =
      sources.match(
        /serenity(?:\.core)?\.version[^0-9]*([0-9]+(?:\.[0-9]+){1,3})/i,
      );

    return {
      ...descriptor,

      version:
        match?.[1],
    };
  }

  async discoverEnvironments(
    workspace: ProjectWorkspace,
  ): Promise<EnvironmentDescriptor[]> {

    const candidates = [
      {
        path:
          resolve(
            workspace.root,
            "serenity.conf",
          ),
        content:
          await readTextIfExists(
            resolve(
              workspace.root,
              "serenity.conf",
            ),
          ),
      },

      {
        path:
          resolve(
            workspace.root,
            "serenity.properties",
          ),
        content:
          await readTextIfExists(
            resolve(
              workspace.root,
              "serenity.properties",
            ),
          ),
      },

      {
        path:
          resolve(
            workspace.root,
            "src",
            "test",
            "resources",
            "serenity.conf",
          ),
        content:
          await readTextIfExists(
            resolve(
              workspace.root,
              "src",
              "test",
              "resources",
              "serenity.conf",
            ),
          ),
      },

      {
        path:
          resolve(
            workspace.root,
            "src",
            "test",
            "resources",
            "serenity.properties",
          ),
        content:
          await readTextIfExists(
            resolve(
              workspace.root,
              "src",
              "test",
              "resources",
              "serenity.properties",
            ),
          ),
      },
    ];

    const environments =
      new Map<
        string,
        EnvironmentDescriptor
      >();

    for (const candidate of candidates) {
      if (!candidate.content) {
        continue;
      }

      const environmentNames =
        findDirectChildBlocks(
          candidate.content,
          "environments",
        );

      for (
        const id
        of environmentNames
      ) {
        environments.set(
          id,
          {
            id,
            displayName: id,
            source:
              candidate.path,
            isDefault:
              id === "default",
          },
        );
      }
    }

    return [
      ...environments.values(),
    ];
  }
  async discoverTests(
    workspace: ProjectWorkspace,
  ): Promise<TestCatalog> {

    return discoverGherkinTests(
      workspace.root,
      {
        frameworkId:
          descriptor.id,

        vocabulary:
          descriptor.vocabulary,

        selectors:
          descriptor.selectors,
      },
    );
  }
}

function findDirectChildBlocks(
  source: string,
  parentName: string,
): string[] {

  const parentPattern =
    new RegExp(
      `\\b${escapeRegExp(parentName)}\\s*\\{`,
      "m",
    );

  const parentMatch =
    parentPattern.exec(source);

  if (
    !parentMatch ||
    parentMatch.index === undefined
  ) {
    return [];
  }

  const openingBrace =
    source.indexOf(
      "{",
      parentMatch.index,
    );

  if (openingBrace < 0) {
    return [];
  }

  const bodyEnd =
    findMatchingBrace(
      source,
      openingBrace,
    );

  if (bodyEnd < 0) {
    return [];
  }

  const body =
    source.slice(
      openingBrace + 1,
      bodyEnd,
    );

  const result:
    string[] = [];

  let depth = 0;
  let index = 0;

  while (index < body.length) {
    const character =
      body[index];

    if (
      character === '"' ||
      character === "'"
    ) {
      index =
        skipQuotedValue(
          body,
          index,
        );

      continue;
    }

    if (character === "#") {
      const lineEnd =
        body.indexOf(
          "\n",
          index,
        );

      index =
        lineEnd < 0
          ? body.length
          : lineEnd + 1;

      continue;
    }

    if (character === "{") {
      depth++;
      index++;
      continue;
    }

    if (character === "}") {
      depth--;
      index++;
      continue;
    }

    if (
      depth === 0 &&
      isIdentifierStart(
        character,
      )
    ) {
      const start =
        index;

      index++;

      while (
        index < body.length &&
        isIdentifierPart(
          body[index],
        )
      ) {
        index++;
      }

      const name =
        body.slice(
          start,
          index,
        );

      let cursor =
        index;

      while (
        cursor < body.length &&
        /\s/.test(
          body[cursor] ?? "",
        )
      ) {
        cursor++;
      }

      if (
        body[cursor] === "{"
      ) {
        result.push(
          name,
        );
      }

      continue;
    }

    index++;
  }

  return [
    ...new Set(result),
  ];
}

function findMatchingBrace(
  source: string,
  openingBrace: number,
): number {

  let depth = 0;

  for (
    let index = openingBrace;
    index < source.length;
    index++
  ) {
    const character =
      source[index];

    if (
      character === '"' ||
      character === "'"
    ) {
      index =
        skipQuotedValue(
          source,
          index,
        );

      continue;
    }

    if (character === "#") {
      const lineEnd =
        source.indexOf(
          "\n",
          index,
        );

      if (lineEnd < 0) {
        return -1;
      }

      index =
        lineEnd;

      continue;
    }

    if (character === "{") {
      depth++;
      continue;
    }

    if (character === "}") {
      depth--;

      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function skipQuotedValue(
  source: string,
  start: number,
): number {

  const quote =
    source[start];

  let index =
    start + 1;

  while (
    index < source.length
  ) {
    if (
      source[index] === "\\"
    ) {
      index += 2;
      continue;
    }

    if (
      source[index] === quote
    ) {
      return index + 1;
    }

    index++;
  }

  return source.length;
}

function isIdentifierStart(
  value:
    string | undefined,
): boolean {

  return Boolean(
    value &&
    /[A-Za-z0-9_-]/.test(
      value,
    ),
  );
}

function isIdentifierPart(
  value:
    string | undefined,
): boolean {

  return Boolean(
    value &&
    /[A-Za-z0-9_.-]/.test(
      value,
    ),
  );
}

function escapeRegExp(
  value: string,
): string {

  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}
