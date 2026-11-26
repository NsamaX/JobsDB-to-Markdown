// Builds one Markdown document from collected jobs. Shared by the content script.
const JobsdbMarkdown = (() => {
  const line = (label, value) => (value ? `- **${label}:** ${value}\n` : '');

  function jobToMarkdown(job, index) {
    let md = `## ${index}. ${job.title || '(no title)'}\n\n`;
    md += line('Company', job.company);
    md += line('Location', job.location);
    md += line('Work type', job.workType);
    md += line('Salary', job.salary || 'Not stated');
    md += line('Classification', job.classification);
    md += line('Listed', job.listed);
    md += line('Job ID', job.id);
    md += line('URL', job.url);
    md += '\n### Job description\n\n';
    md += (job.description || '(description not captured)').trim() + '\n';
    return md;
  }

  function build(state) {
    const jobs = Object.values(state.jobs || {});
    const date = new Date().toISOString().slice(0, 10);
    let md = `# JobsDB export: ${state.query || 'search'}\n\n`;
    md += line('Search URL', state.searchUrl);
    md += line('Exported', date);
    md += line('Jobs', String(jobs.length));
    md += '\n---\n\n';
    md += jobs.map((j, i) => jobToMarkdown(j, i + 1)).join('\n---\n\n');
    return md;
  }

  function filename(state) {
    const slug = (state.query || 'search').toLowerCase().replace(/[^a-z0-9ก-๙]+/g, '-').replace(/^-|-$/g, '');
    return `jobsdb_${slug}_${new Date().toISOString().slice(0, 10)}.md`;
  }

  return { build, filename };
})();
