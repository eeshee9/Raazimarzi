// src/pages/MediatorCaseNoteEditor.js — Case note editor/viewer for one case
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ChevronDown, Loader2, AlertCircle, Save,
  StickyNote, Lock, ExternalLink, Pencil, Check, X as XIcon,
  Flag, Eye, MessageSquare, MoreHorizontal,
} from "lucide-react";
import MediatorLayout from "../components/MediatorLayout";
import axiosInstance from "../api/axios";
import "./MediatorNotes.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  }).toUpperCase();
};

const CATEGORIES = [
  { value: "General",             label: "General" },
  { value: "Session Observation", label: "Session observation" },
  { value: "Document Flag",       label: "Document flag" },
  { value: "Action Item",         label: "Action item" },
];

const CAT_DOT = {
  "General":             "#9CA3AF",
  "Session Observation": "#F59E0B",
  "Document Flag":       "#EF4444",
  "Action Item":         "#7C3AED",
};

const catDot  = (cat) => CAT_DOT[cat] || "#9CA3AF";
const catLabel = (cat) => CATEGORIES.find((c) => c.value === cat)?.label.toUpperCase() || cat?.toUpperCase() || "GENERAL";

// ─── Entry card ───────────────────────────────────────────────────────────────

const EntryCard = ({ entry, isMeetingNote, onEditStart }) => (
  <div className="mcn-entry-card">
    <div className="mcn-entry-header">
      <span
        className="mcn-entry-dot"
        style={{ background: isMeetingNote ? "#2563EB" : catDot(entry.category) }}
      />
      <span className="mcn-entry-meta">
        {fmtDate(entry.createdAt || entry.updatedAt)}
        {" • "}
        <span className="mcn-entry-cat">
          {isMeetingNote ? "MEETING NOTE" : catLabel(entry.category)}
        </span>
      </span>
      {!isMeetingNote && onEditStart && (
        <button className="mcn-entry-edit-btn" onClick={() => onEditStart(entry)} title="Edit note">
          <Pencil size={12} />
        </button>
      )}
    </div>
    <p className="mcn-entry-body">{entry.content || "—"}</p>
    {isMeetingNote && entry.meetingId?.meetingTitle && (
      <span className="mcn-entry-meeting-label">
        <MessageSquare size={10} /> {entry.meetingId.meetingTitle}
      </span>
    )}
  </div>
);

// ─── Inline edit form ─────────────────────────────────────────────────────────

const EditForm = ({ entry, onSave, onCancel }) => {
  const [content,  setContent]  = useState(entry.content || "");
  const [category, setCategory] = useState(entry.category || "General");
  const [saving,   setSaving]   = useState(false);

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    await onSave(entry._id, { content: content.trim(), category });
    setSaving(false);
  };

  return (
    <div className="mcn-inline-edit">
      <div className="mcn-select-wrap mcn-edit-cat-sel">
        <select
          className="mcn-select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <ChevronDown size={12} className="mcn-sel-icon" />
      </div>
      <textarea
        className="mcn-edit-ta"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        autoFocus
      />
      <div className="mcn-edit-actions">
        <button className="mcn-discard-btn" onClick={onCancel}><XIcon size={13} /> Discard</button>
        <button className="mcn-save-btn" onClick={handleSave} disabled={saving || !content.trim()}>
          {saving ? <Loader2 size={13} className="mcn-spin" /> : <Check size={13} />}
          Save
        </button>
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const MediatorCaseNoteEditor = () => {
  const { caseId } = useParams();
  const navigate   = useNavigate();

  const [caseObj,    setCaseObj]    = useState(null);
  const [caseNotes,  setCaseNotes]  = useState([]);
  const [meetNotes,  setMeetNotes]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  // New note form
  const [newContent,  setNewContent]  = useState("");
  const [newCategory, setNewCategory] = useState("General");
  const [saving,      setSaving]      = useState(false);
  const [saveErr,     setSaveErr]     = useState(null);

  // Inline edit
  const [editEntry,  setEditEntry]  = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axiosInstance.get(`/mediator/case-notes/${caseId}`);
      setCaseObj(data.case);
      setCaseNotes(data.caseNotes || []);
      setMeetNotes(data.meetingNotes || []);
    } catch (err) {
      setError(err.response?.status === 403
        ? "This case is not assigned to you."
        : "Failed to load case notes.");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { load(); }, [load]);

  // Combined timeline — CaseNotes + MeetingNotes sorted newest-first
  const timeline = [
    ...caseNotes.map((n) => ({ ...n, _type: "case" })),
    ...meetNotes.map((n) => ({ ...n, _type: "meeting" })),
  ].sort((a, b) => new Date(b.createdAt || b.updatedAt) - new Date(a.createdAt || a.updatedAt));

  const handleCreate = async () => {
    if (!newContent.trim()) return;
    setSaving(true);
    setSaveErr(null);
    try {
      const { data } = await axiosInstance.post(`/mediator/case-notes/${caseId}`, {
        content:  newContent.trim(),
        category: newCategory,
      });
      setCaseNotes((prev) => [data.note, ...prev]);
      setNewContent("");
      setNewCategory("General");
    } catch {
      setSaveErr("Failed to save note. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setNewContent("");
    setNewCategory("General");
    setSaveErr(null);
  };

  const handleEditSave = async (noteId, patch) => {
    try {
      const { data } = await axiosInstance.patch(`/mediator/case-notes/entry/${noteId}`, patch);
      setCaseNotes((prev) => prev.map((n) => (n._id === noteId ? data.note : n)));
      setEditEntry(null);
    } catch {
      // silent — keep edit form open for retry
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <MediatorLayout>
        <div className="mcn-page">
          <div className="mcn-state">
            <Loader2 size={26} className="mcn-spin" />
            <span>Loading case notes…</span>
          </div>
        </div>
      </MediatorLayout>
    );
  }

  // ── Error ──
  if (error || !caseObj) {
    return (
      <MediatorLayout>
        <div className="mcn-page">
          <button className="mcn-back-btn" onClick={() => navigate("/mediator/case-notes")}>
            <ArrowLeft size={15} /> Back to My Case Notes
          </button>
          <div className="mcn-state mcn-state--error">
            <AlertCircle size={24} />
            <span>{error || "Case not found."}</span>
          </div>
        </div>
      </MediatorLayout>
    );
  }

  const recentThree = timeline.slice(0, 3);

  return (
    <MediatorLayout>
      <div className="mcn-page">

        {/* Back */}
        <button className="mcn-back-btn" onClick={() => navigate("/mediator/case-notes")}>
          <ArrowLeft size={15} /> Back to My Case Notes
        </button>

        {/* Page title */}
        <div className="mcn-editor-header">
          <div>
            <h1 className="mcn-editor-title">
              My Notes — {caseObj.caseId || "—"}
            </h1>
            <p className="mcn-editor-sub">Private notes — visible to mediator &amp; admin only</p>
          </div>
          <button
            className="mcn-case-link-btn"
            onClick={() => navigate(`/mediator/cases/${caseId}`)}
            title="Open case detail"
          >
            <ExternalLink size={13} /> View Case
          </button>
        </div>

        {/* Body */}
        <div className="mcn-editor-body">

          {/* Left: Add note form */}
          <div className="mcn-editor-left">
            <div className="mcn-add-form-card">
              <h3 className="mcn-add-form-title">Add new private note</h3>

              {/* Category */}
              <label className="mcn-form-label">Note Category</label>
              <div className="mcn-select-wrap mcn-form-sel">
                <select
                  className="mcn-select"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="mcn-sel-icon" />
              </div>

              {/* Content */}
              <label className="mcn-form-label">Content</label>
              <textarea
                className="mcn-note-ta"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Type your private notes here…"
                rows={10}
              />

              {saveErr && (
                <p className="mcn-form-err"><AlertCircle size={13} /> {saveErr}</p>
              )}

              <div className="mcn-form-btns">
                <button className="mcn-discard-btn" onClick={handleDiscard}>
                  Discard
                </button>
                <button
                  className="mcn-save-btn"
                  onClick={handleCreate}
                  disabled={saving || !newContent.trim()}
                >
                  {saving
                    ? <><Loader2 size={13} className="mcn-spin" /> Saving…</>
                    : "Save Note"
                  }
                </button>
              </div>
            </div>

            {/* Privacy notice */}
            <div className="mcn-privacy-notice">
              <Lock size={13} />
              <span>
                Private notes are visible to you and the admin only. They are never shared with
                case parties, case managers, or any third party.
              </span>
            </div>
          </div>

          {/* Right: Recent entries */}
          <div className="mcn-editor-right">
            <div className="mcn-recent-header">
              <h3 className="mcn-recent-title">Recent Entries</h3>
              <span className="mcn-recent-count">{timeline.length} Note{timeline.length !== 1 ? "s" : ""}</span>
            </div>

            {timeline.length === 0 ? (
              <div className="mcn-entries-empty">
                <StickyNote size={28} />
                <p>No notes yet. Add your first note using the form.</p>
              </div>
            ) : (
              <>
                {/* Show last 3, all with inline-edit for case notes */}
                {recentThree.map((entry) =>
                  editEntry?._id === entry._id ? (
                    <EditForm
                      key={entry._id}
                      entry={entry}
                      onSave={handleEditSave}
                      onCancel={() => setEditEntry(null)}
                    />
                  ) : (
                    <EntryCard
                      key={entry._id}
                      entry={entry}
                      isMeetingNote={entry._type === "meeting"}
                      onEditStart={entry._type === "case" ? setEditEntry : null}
                    />
                  )
                )}

                {/* Show all remaining */}
                {timeline.length > 3 && (
                  <div className="mcn-all-entries">
                    <p className="mcn-all-label">All Entries ({timeline.length})</p>
                    {timeline.slice(3).map((entry) =>
                      editEntry?._id === entry._id ? (
                        <EditForm
                          key={entry._id}
                          entry={entry}
                          onSave={handleEditSave}
                          onCancel={() => setEditEntry(null)}
                        />
                      ) : (
                        <EntryCard
                          key={entry._id}
                          entry={entry}
                          isMeetingNote={entry._type === "meeting"}
                          onEditStart={entry._type === "case" ? setEditEntry : null}
                        />
                      )
                    )}
                  </div>
                )}

                {/* View case history */}
                <button
                  className="mcn-view-history-btn"
                  onClick={() => navigate(`/mediator/cases/${caseId}`)}
                >
                  View All Case History
                </button>
              </>
            )}
          </div>

        </div>
      </div>
    </MediatorLayout>
  );
};

export default MediatorCaseNoteEditor;
