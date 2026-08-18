-- Drop the test-response flag. The admin preview/test flow is being removed;
-- if there's a future need for non-counted admin previews, the right approach
-- is a separate preview table, not a flag column on `form_responses`.
drop index if exists form_responses_is_test_idx;
alter table form_responses drop column if exists is_test;
