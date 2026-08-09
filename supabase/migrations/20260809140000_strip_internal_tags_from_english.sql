-- Bug fix: authoring-only "(bonus)" / "(bonus, contrast)" / "(bonus, question
-- form)" / "(bonus, sentence-level)" tags were written directly into the
-- `english` column, which is learner-facing -- the app was literally asking
-- "Which one means 'Please eat (respectful, to elders) (bonus)'?" out loud
-- to the categorization tag. These were meant as internal content-authoring
-- bookkeeping only. Strips the trailing "(bonus...)" tag; keeps other
-- clarifying parens (e.g. "(respectful, to elders)") since those ARE useful
-- learner-facing context, not internal metadata.
update phrases
set english = regexp_replace(english, '\s*\(bonus[^)]*\)\s*$', '')
where english ~* '\(bonus';
