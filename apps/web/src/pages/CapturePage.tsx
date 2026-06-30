import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type Topic, type Trail } from '../lib/api';

export function CapturePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [comment, setComment] = useState('');
  const [title, setTitle] = useState('');
  const [bodyMd, setBodyMd] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [trails, setTrails] = useState<Trail[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [trailId, setTrailId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!slug) return;
    api.topics(slug).then(setTopics);
    api.trails(slug).then(setTrails);
  }, [slug]);

  const preview = async () => {
    if (!url.trim()) return;
    setPreviewing(true);
    try {
      const result = await api.capturePreview(url);
      if (result.ok) {
        setTitle((result.title as string) ?? '');
        setBodyMd((result.bodyMd as string) ?? '');
        setManualMode(false);
      } else {
        setManualMode(true);
        setTitle((result.title as string) ?? url);
      }
    } finally {
      setPreviewing(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.capture({
        researchSlug: slug,
        url: url || undefined,
        title: title || undefined,
        comment: comment || undefined,
        bodyMd: bodyMd || undefined,
        topicSlugs: selectedTopics,
        trailId: trailId || undefined,
        type: manualMode ? 'article_manual' : undefined,
      });
      navigate(`/r/${slug}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="font-serif text-3xl font-bold mb-6">Capture</h1>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-2">URL</label>
          <div className="flex gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              className="flex-1 px-4 py-3 rounded-lg border border-stone-200 bg-white"
            />
            <button
              type="button"
              onClick={preview}
              disabled={previewing}
              className="px-4 py-2 bg-stone-100 rounded-lg text-sm hover:bg-stone-200"
            >
              {previewing ? '…' : 'Fetch'}
            </button>
          </div>
          {manualMode && (
            <p className="text-xs text-amber-600 mt-2">Fetch failed — add title and paste content below.</p>
          )}
        </div>

        {(manualMode || title) && (
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-stone-200 bg-white"
            />
          </div>
        )}

        {manualMode && (
          <div>
            <label className="block text-sm font-medium mb-2">Content (paste)</label>
            <textarea
              value={bodyMd}
              onChange={(e) => setBodyMd(e.target.value)}
              rows={8}
              className="w-full px-4 py-3 rounded-lg border border-stone-200 bg-white resize-y"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-2">Your comment</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What resonated? Why did you save this?"
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-stone-200 bg-white resize-none"
          />
        </div>

        {topics.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-2">Topics</label>
            <div className="flex flex-wrap gap-2">
              {topics.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() =>
                    setSelectedTopics((prev) =>
                      prev.includes(t.slug) ? prev.filter((s) => s !== t.slug) : [...prev, t.slug]
                    )
                  }
                  className={`px-3 py-1 rounded-full text-sm ${
                    selectedTopics.includes(t.slug) ? 'bg-ink text-cream' : 'bg-white border border-stone-200'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {trails.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-2">Add to trail</label>
            <select
              value={trailId}
              onChange={(e) => setTrailId(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-stone-200 bg-white"
            >
              <option value="">None</option>
              {trails.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={save}
          disabled={saving}
          className="w-full py-3 bg-ink text-cream rounded-lg font-medium hover:bg-ink/90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save to magazine'}
        </button>
      </div>
    </div>
  );
}
