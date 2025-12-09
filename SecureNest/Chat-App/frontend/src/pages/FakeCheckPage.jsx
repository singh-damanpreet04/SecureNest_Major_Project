import { useState, useEffect } from "react";
import { axiosInstance } from "../lib/axios";
import { COUNTRIES, US_STATES, INDIA_STATES } from "../data/countries";
import ScreenEffect from "../components/ScreenEffect";

export default function FakeCheckPage() {
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [scope, setScope] = useState("national");
  const [country, setCountry] = useState("");
  const [stateRegion, setStateRegion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [showEffect, setShowEffect] = useState(null);
  const [countryFilter, setCountryFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");

  // Scope-aware placeholder
  const placeholderText =
    scope === "international"
      ? "e.g., WHO issues advisory on new influenza strain • OpenAI launches GPT-5 with improved multimodal reasoning"
      : "e.g., State govt announces new metro line in Mumbai • Punjab issues flood advisory";

  // Quick example chips for International + MNC/Company news
  const intlExamples = [
    "UN releases global climate adaptation report 2025",
    "WHO issues advisory on new influenza strain",
    "World Bank announces $2B funding for clean energy projects",
    "EU Parliament passes AI Act"
  ];

  const mncExamples = [
    "OpenAI launches GPT-5 with improved multimodal reasoning",
    "Apple announces iOS 19 with new privacy features",
    "Google unveils Gemini update at I/O",
    "NVIDIA announces Blackwell GPU availability"
  ];

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    setShowEffect(null);
    try {
      const { data } = await axiosInstance.post("/fakecheck", {
        url: url || undefined,
        text: text || undefined,
        scope,
        country: scope === "national" ? country : undefined,
        state: stateRegion || undefined,
      });
      setResult(data);
      // Show effect based on verdict
      if (data.verdict === 'likely_fake' || data.verdict === 'likely_real') {
        setShowEffect(data.verdict.split('_')[1]); // 'fake' or 'real'
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto relative p-6">
      <ScreenEffect 
        status={showEffect} 
        onComplete={() => setShowEffect(null)} 
      />
      <h1 className="text-2xl font-bold mb-4 text-primary">Fake News Check</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-primary">News URL (optional)</label>
          <input
            type="url"
            className="w-full border border-secondary rounded px-3 py-2 bg-secondary text-primary"
            placeholder="https://example.com/article"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        {/* Quick Examples (shown for International scope) */}
        {scope === "international" && (
          <div className="mt-2">
            <div className="text-sm text-gray-400 mb-2">Quick examples</div>
            <div className="flex flex-wrap gap-2">
              {[...intlExamples, ...mncExamples].map((ex, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => {
                    setScope("international");
                    setCountry("");
                    setText(ex);
                  }}
                  className="px-3 py-1 text-xs rounded-full border border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700"
                  title="Click to autofill"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium mb-1 text-primary">Or Paste Text (optional)</label>
          <textarea
            className="w-full h-32 border border-secondary rounded px-3 py-2 bg-secondary text-primary"
            placeholder={placeholderText}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        
        {/* Scope Selection */}
        <div>
          <label className="block text-sm font-medium mb-1 text-primary">News Scope (required)</label>
          <div className="flex gap-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="scope"
                value="national"
                checked={scope === "national"}
                onChange={(e) => setScope(e.target.value)}
                className="mr-2"
              />
              <span className="text-primary">National News</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="scope"
                value="international"
                checked={scope === "international"}
                onChange={(e) => {
                  setScope(e.target.value);
                  setCountry(""); // Clear country when switching to international
                }}
                className="mr-2"
              />
              <span className="text-primary">International News (UN, WHO, BBC, etc.)</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Country {scope === "national" ? "(required)" : "(optional)"}
            </label>
            <input
              type="text"
              list="country-list"
              className={`w-full border rounded px-3 py-2 ${
                scope === "international" 
                  ? "bg-gray-800 text-gray-500 cursor-not-allowed" 
                  : "bg-gray-900 text-white"
              }`}
              placeholder={scope === "international" ? "Not required for international news" : "e.g., US or India"}
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setCountryFilter(e.target.value);
              }}
              required={scope === "national"}
              disabled={scope === "international"}
            />
            <datalist id="country-list">
              {COUNTRIES.filter((c) =>
                c.name.toLowerCase().includes(countryFilter.toLowerCase()) ||
                c.code.toLowerCase().includes(countryFilter.toLowerCase())
              ).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">State/Province (optional)</label>
            <input
              type="text"
              list="state-list"
              className="w-full border rounded px-3 py-2 bg-gray-900 text-white"
              placeholder="e.g., CA or Maharashtra"
              value={stateRegion}
              onChange={(e) => {
                setStateRegion(e.target.value);
                setStateFilter(e.target.value);
              }}
            />
            <datalist id="state-list">
              {(country === "US" ? US_STATES : country === "IN" ? INDIA_STATES : [])
                .filter((s) => s.toLowerCase().includes(stateFilter.toLowerCase()))
                .map((s) => (
                  <option key={s} value={s} />
                ))}
            </datalist>
          </div>
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          style={{ backgroundColor: 'var(--accent)' }}
          disabled={loading}
        >
          {loading ? "Checking..." : "Check"}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 rounded bg-red-900 text-red-200">{String(error)}</div>
      )}

      {result && (
        <div className="mt-6 border rounded p-4 bg-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Result</h2>
            <span className="text-sm text-gray-300">Model: {result.model_version || 'v1.0'}</span>
          </div>
          
          {/* Verdict Badge */}
          <div className="mb-4">
            <div className={`inline-flex items-center px-4 py-2 rounded-lg font-semibold text-lg ${
              result.verdict === 'likely_real' 
                ? 'bg-green-900 text-green-200 border border-green-700' 
                : result.verdict === 'likely_fake'
                ? 'bg-red-900 text-red-200 border border-red-700'
                : 'bg-yellow-900 text-yellow-200 border border-yellow-700'
            }`}>
              {result.verdict === 'likely_real' && '✓ This is Real News'}
              {result.verdict === 'likely_fake' && '✗ This is Fake News'}
              {result.verdict === 'not_enough_info' && '⚠ Not Enough Information'}
            </div>
          </div>

          {/* Verdict Description */}
          <div className="mt-3 p-3 rounded bg-gray-900 border border-gray-700">
            {result.verdict === 'likely_real' && (
              <p className="text-gray-300">
                This news appears to be <span className="text-green-400 font-semibold">authentic</span>. We found reliable sources and evidence supporting this information.
              </p>
            )}
            {result.verdict === 'likely_fake' && (
              <p className="text-gray-300">
                This news appears to be <span className="text-red-400 font-semibold">fake or misleading</span>. No reliable sources were found to support this claim.
              </p>
            )}
            {result.verdict === 'not_enough_info' && (
              <p className="text-gray-300">
                We couldn't find enough evidence to verify this claim. Please check multiple trusted sources before sharing.
              </p>
            )}
          </div>
          
          {/* Show reliable sources for REAL news */}
          {result.verdict === 'likely_real' && result.evidence && result.evidence.length > 0 && (
            <div className="mt-4">
              <p className="font-medium mb-2 text-green-400">✓ Reliable Sources Found ({result.evidence.length})</p>
              <ul className="space-y-2">
                {result.evidence.map((e, i) => (
                  <li key={i} className="p-3 rounded bg-gray-900 border border-green-700">
                    <div className="text-sm font-semibold text-green-300">{e.source}</div>
                    {e.url && (
                      <a 
                        className="text-blue-400 hover:text-blue-300 text-sm underline break-all" 
                        href={e.url} 
                        target="_blank" 
                        rel="noreferrer"
                      >
                        {e.url}
                      </a>
                    )}
                    {e.stance && (
                      <div className="text-xs mt-1 text-gray-400">
                        Status: <span className="text-green-400">{e.stance}</span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Show lack of sources for FAKE news */}
          {result.verdict === 'likely_fake' && (
            <div className="mt-4">
              <p className="font-medium mb-2 text-red-400">✗ No Reliable Sources Found</p>
              <div className="p-3 rounded bg-gray-900 border border-red-700">
                <p className="text-sm text-gray-300">
                  We could not find any credible news sources or fact-checking organizations that verify this claim. 
                  This is a strong indicator that the information may be false or misleading.
                </p>
              </div>
              {result.evidence && result.evidence.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-400 mb-2">Sources that refute this claim:</p>
                  <ul className="space-y-2">
                    {result.evidence.filter(e => e.stance === 'refutes').map((e, i) => (
                      <li key={i} className="p-2 rounded bg-gray-900 border border-gray-700 text-sm">
                        <div className="font-medium text-gray-300">{e.source}</div>
                        {e.url && (
                          <a 
                            className="text-blue-400 hover:text-blue-300 text-xs underline break-all" 
                            href={e.url} 
                            target="_blank" 
                            rel="noreferrer"
                          >
                            {e.url}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Show analysis details for NOT_ENOUGH_INFO */}
          {result.verdict === 'not_enough_info' && (
            <div className="mt-4">
              <p className="font-medium mb-2 text-yellow-400">Analysis Details</p>
              <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                {(result.top_signals || []).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
