-- Swap the retired brand line for the current one inside stored templates.
--
-- Mailing templates are complete HTML documents held in `mailing_templates`,
-- so this is a data fix rather than a code change: the old line appears in each
-- template's header and footer, and both occurrences are replaced in place.
--
-- Safe to re-run, and a no-op on rows that never carried the old line.

update public.mailing_templates
set body_html = replace(
      body_html,
      'Plan your positions. Execute when ready.',
      'Capital Routing Layer for RWAs'
    )
where body_html like '%Plan your positions. Execute when ready.%';

-- Inline broadcast copy can carry the same header/footer markup.
update public.mailing_messages
set body_html = replace(
      body_html,
      'Plan your positions. Execute when ready.',
      'Capital Routing Layer for RWAs'
    )
where body_html like '%Plan your positions. Execute when ready.%';
