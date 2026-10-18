import assert from "node:assert/strict";
import test from "node:test";
import { programTitles, PROGRAM_ALIAS_MAP, schoolOptions, schoolSearchAliases } from "../../lib/application/catalogs";
import { rankOptions, resolveTypedOption, searchProgramsWithAliases } from "../../lib/application/search";
import institutions from "../../lib/application/data/institutions.json";
import programs from "../../lib/application/data/programs.json";

test("curated lists have the expected sizes", () => {
  assert.ok(institutions.options.length >= 100, `institutions ${institutions.options.length}`);
  assert.ok(programs.programs.length >= 90, `programs ${programs.programs.length}`);
});

test("typing bsn resolves to the canonical BS Nursing program", () => {
  const hits = searchProgramsWithAliases("bsn", programTitles, PROGRAM_ALIAS_MAP);
  assert.ok(hits.length > 0);
  assert.match(hits[0]?.label ?? "", /Nursing/);
  const typed = searchProgramsWithAliases("Bachelors in Nursing", programTitles, PROGRAM_ALIAS_MAP);
  assert.equal(typed[0]?.label, hits[0]?.label);
  const typo = searchProgramsWithAliases("Bachlor of Science in Nurisng", programTitles, PROGRAM_ALIAS_MAP);
  assert.equal(typo[0]?.label, hits[0]?.label);
});

test("fccu and FC College both resolve to Forman Christian College", () => {
  for (const query of ["fccu", "FC College", "kinnaird"]) {
    const match = resolveTypedOption(query, schoolOptions, schoolSearchAliases);
    assert.ok(match, query);
    if (query === "kinnaird") assert.match(match.label, /Kinnaird/);
    else assert.match(match.label, /Forman Christian College/);
  }
  const ranked = rankOptions("fccu", schoolOptions, schoolSearchAliases);
  assert.match(ranked[0]?.label ?? "", /Forman/);
});
