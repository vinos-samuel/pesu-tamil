-- Phase 1 of the mastery-gate rebuild: adds the reverse-Recognize direction
-- (hear Tamil -> pick English caption), the "second modality" that lets
-- phrases with no Build-it word breakdown still reach the mastery gate.
-- Same widening pattern as 20260809120000_produce_tier_redesign.sql.

alter table attempts drop constraint if exists attempts_tier_check;
alter table attempts add constraint attempts_tier_check
  check (tier in ('learn', 'recognize', 'reverse-recognize', 'say-it', 'build-it'));
