import Link from "next/link";
import { listMailingTemplates } from "@/lib/mailing";
import { DeleteTemplateButton } from "./DeleteTemplateButton";

export default async function MailingTemplatesPage() {
  const templates = await listMailingTemplates();

  return (
    <div className="p-6 lg:p-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/dashboard/mailing"
            className="text-sm text-[#229EDF] hover:underline"
          >
            ← Back to mailing
          </Link>
          <h1 className="mt-4 text-2xl font-semibold text-white">
            Mailing templates
          </h1>
          <p className="text-sm text-white/50">
            Reusable subject + HTML content for mailing automations.
          </p>
        </div>
        <Link
          href="/dashboard/mailing/templates/new"
          className="inline-flex items-center justify-center rounded-full bg-[#229EDF] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1a8bc7]"
        >
          New template
        </Link>
      </header>

      {templates.length === 0 ? (
        <div className="rounded-2xl border border-white/8 bg-[#1C1C1C] px-6 py-16 text-center text-white/60">
          No templates yet. Create your first one.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/8 bg-[#1C1C1C]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/8 text-white/50">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Created at</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {templates.map((t) => (
                <tr key={t.id} className="text-white/85">
                  <td className="px-4 py-3 font-medium text-white">{t.name}</td>
                  <td className="px-4 py-3 text-white/70">{t.subject}</td>
                  <td className="px-4 py-3 text-white/60">
                    {new Date(t.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-start gap-2">
                      <Link
                        href={`/dashboard/mailing/templates/${t.id}/edit`}
                        className="text-[#229EDF] hover:underline"
                      >
                        Edit
                      </Link>
                      <DeleteTemplateButton id={t.id} name={t.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
