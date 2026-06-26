// src/pages/FileNewCaseStep3.js
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import UserSidebar from "../components/UserSidebar";
import api from "../api/axios";
import { MAX_FILES_PER_CASE, MAX_FILE_SIZE, ACCEPTED_FILE_TYPES, ACCEPTED_FILE_EXTENSIONS } from "../utils/caseValidation";
import "./FileNewCase.css";
import "./FileNewCaseStep3.css";

const ACCEPTED = ACCEPTED_FILE_TYPES;
const MAX_SIZE = MAX_FILE_SIZE;

const getFileIcon = (type) => {
  if (type === "application/pdf") return "📄";
  if (type.startsWith("image/")) return "🖼️";
  if (type.includes("word") || type.includes("msword")) return "📃";
  return "📎";
};

const formatSize = (bytes) => {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / 1024).toFixed(0) + " KB";
};

const truncateName = (name, max = 24) =>
  name.length > max ? name.slice(0, max - 3) + "..." : name;

// ── Map localStorage shape → API shape ──────────────────────────────────────
// localStorage.caseData = {
//   petitioner: { fullName, mobile, email, dob, gender, address },
//   defendants: [{ fullName, mobile, email, dob, gender, address }],
//   step2: { category, caseTitle, isMoneyDispute, claimRange, description, incidentDate, incidentLocation }
// }
const buildPayload = (caseData) => {
  const step2 = caseData.step2 || {};
  const petitioner = caseData.petitioner || {};
  const defendant = (caseData.defendants || [])[0] || {};

  // Map category id → readable caseType
  const CATEGORY_MAP = {
    individual: "individual",
    commercial:  "commercial",
    consumer:    "consumer",
  };

  return {
    caseType:      CATEGORY_MAP[step2.category] || step2.category || "Individual",
    caseTitle:     step2.caseTitle || "",
    causeOfAction: step2.description || "",
    reliefSought:  "",           // not collected in current UI, send empty
    caseValue:     step2.isMoneyDispute ? step2.claimRange : "non-monetary",
    petitioner: {
      fullName:  petitioner.fullName  || "",
      gender:    petitioner.gender    || "",
      dob:       petitioner.dob       || "",
      mobile:    petitioner.mobile    || "",
      email:     petitioner.email     || "",
      address:   petitioner.address   || "",
      fatherName: "",
      idType:    "",
      idProof:   "",
    },
    defendant: {
      fullName:   defendant.fullName  || "",
      gender:     defendant.gender    || "",
      dob:        defendant.dob       || "",
      mobile:     defendant.mobile    || "",
      email:      defendant.email     || "",
      address:    defendant.address   || "",
      fatherName: "",
      idDetails:  "",
    },
    caseFacts: {
      caseSummary:      step2.description        || "",
      documentTitle:    "",
      documentType:     "",
      witnessDetails:   "",
      place:            step2.incidentLocation   || "",
      date:             step2.incidentDate       || "",
      digitalSignature: petitioner.fullName      || "",
      declaration:      true,   // user reached step 3 = implicitly accepted
    },
  };
};

const FileNewCaseStep3 = () => {
  const navigate = useNavigate();
  const inputRef = useRef();
  const fileObjectsRef = useRef({});
  const isSubmittingRef = useRef(false);

  const [files, setFiles]       = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Restore file metadata from localStorage. Note: the actual File blobs
  // can never survive a remount/reload (browsers don't let you persist a
  // File object) — only their names/sizes do. Mark restored entries as
  // "Needs re-upload" so the UI doesn't lie about files being attached;
  // submitting silently used to skip these with no error, so the case
  // would be created with no documents.
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("caseData")) || {};
    if (stored.step3Files) {
      setFiles(stored.step3Files.map((f) => ({ ...f, status: "Needs re-upload" })));
    }
  }, []);

  const persistMeta = (list) => {
    const meta = list.map(({ name, size, type, status }) => ({ name, size, type, status }));
    const existing = JSON.parse(localStorage.getItem("caseData")) || {};
    localStorage.setItem("caseData", JSON.stringify({ ...existing, step3Files: meta }));
  };

  const addFiles = (incoming) => {
    setFileError("");
    const valid = [];
    let remainingSlots = MAX_FILES_PER_CASE - files.length;
    for (const f of incoming) {
      if (remainingSlots <= 0) {
        setFileError(`You can attach at most ${MAX_FILES_PER_CASE} documents to a case.`);
        break;
      }
      if (!ACCEPTED.includes(f.type)) {
        setFileError(`"${f.name}" is not supported. Use PDF, DOC, DOCX, JPG, PNG, or WEBP.`);
        continue;
      }
      if (f.size > MAX_SIZE) {
        setFileError(`"${f.name}" exceeds 10 MB limit.`);
        continue;
      }
      if (files.find((x) => x.name === f.name && x.size === f.size)) continue;
      fileObjectsRef.current[`${f.name}-${f.size}`] = f;
      valid.push({ name: f.name, size: f.size, type: f.type, status: "Complete" });
      remainingSlots -= 1;
    }
    const updated = [...files, ...valid];
    setFiles(updated);
    persistMeta(updated);
  };

  const removeFile = (idx) => {
    const f = files[idx];
    delete fileObjectsRef.current[`${f.name}-${f.size}`];
    const updated = files.filter((_, i) => i !== idx);
    setFiles(updated);
    persistMeta(updated);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleBrowse = (e) => {
    addFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const handleSaveDraft = () => {
    persistMeta(files);
    alert("Draft saved!");
  };

  // ── Submit case to backend ───────────────────────────────────────────────────
  const handleSubmit = async () => {
    // Ref check (not state) so a fast double-click can't slip a second
    // request through before React re-renders the disabled button.
    if (isSubmittingRef.current) return;

    setSubmitError("");

    const caseData = JSON.parse(localStorage.getItem("caseData")) || {};

    if (!caseData.petitioner?.fullName || !caseData.step2?.caseTitle) {
      setSubmitError("Some required case information is missing. Please go back and complete all steps.");
      return;
    }

    const payload = buildPayload(caseData);

    if (!payload.petitioner.email) {
      setSubmitError("Petitioner email is required. Please go back to Step 1.");
      return;
    }
    if (!payload.defendant.email) {
      setSubmitError("Respondent email is required. Please go back to Step 1.");
      return;
    }

    // A file that lost its blob (e.g. user left and came back to this step)
    // would otherwise be silently skipped during upload, so the case ends up
    // with no documents and no indication anything went wrong.
    const missingFiles = files.filter((f) => !fileObjectsRef.current[`${f.name}-${f.size}`]);
    if (missingFiles.length > 0) {
      setSubmitError(
        `These files need to be re-selected before submitting (they weren't retained across this page reload): ${missingFiles
          .map((f) => f.name)
          .join(", ")}`
      );
      return;
    }

    isSubmittingRef.current = true;
    setSubmitting(true);
    let newCaseId = null;
    try {
      const caseRes = await api.post("/cases/file", payload);
      newCaseId = caseRes.data?.case?._id;

      if (newCaseId && files.length > 0) {
        for (const meta of files) {
          const fileObj = fileObjectsRef.current[`${meta.name}-${meta.size}`];
          const form = new FormData();
          form.append("file", fileObj);
          form.append("caseId", newCaseId);
          form.append("documentTitle", meta.name.replace(/\.[^/.]+$/, "") || meta.name);
          form.append("category", "Evidence");
          await api.post("/documents/upload", form, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        }
      }

      localStorage.removeItem("caseData");
      setSubmitSuccess(true);
      setTimeout(() => navigate("/user/my-cases"), 1200);
    } catch (err) {
      // The case may already have been created even though a later step
      // (e.g. a document upload) failed. Surface that clearly instead of a
      // generic "failed to file case" message that would push the user to
      // hit Submit again and create a duplicate case.
      const caseWasCreated = !!newCaseId;
      const msg =
        err.response?.data?.message ||
        (Array.isArray(err.response?.data?.errors)
          ? err.response.data.errors.join(", ")
          : null) ||
        "Failed to file case. Please try again.";
      setSubmitError(
        caseWasCreated
          ? `Your case was filed successfully, but one or more documents failed to upload (${msg}). Please add the remaining documents from the case's Documents tab — do not submit this form again.`
          : msg
      );
      if (caseWasCreated) {
        localStorage.removeItem("caseData");
      }
    } finally {
      isSubmittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="dashboard-container">
      <UserSidebar activePage="file-case" />

      <section className="fnc-main">
        {/* Step Progress Bar — step 4 now shows as inactive/disabled */}
        <div className="fnc-steps">
          {[
            { label: "Personal Details", icon: "👤", step: 1 },
            { label: "Case Details",     icon: "📋", step: 2 },
            { label: "Documents",        icon: "📄", step: 3 },
          ].map(({ label, icon, step }, i) => (
            <React.Fragment key={step}>
              <div
                className={`fnc-step ${
                  step < 3 ? "completed" : step === 3 ? "active" : ""
                }`}
              >
                <div className="fnc-step-icon">
                  {step < 3 ? "✓" : icon}
                </div>
                <span>{label}</span>
              </div>
              {i < 2 && (
                <div className={`fnc-step-line ${step < 3 ? "completed" : ""}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Body */}
        <div className="fnc-body">
          <h2 className="fnc-title">Upload Documents</h2>
          <p className="fnc-subtitle">
            Support your case with relevant documents, images, or records. This
            information remains confidential within the sanctuary.
          </p>

          {/* Info banner */}
          <div className="s3-info-banner">
            <span className="s3-banner-icon">❗</span>
            <p>
              Please upload a valid ID proof (Aadhaar, PAN, or Driving License)
              of petitioner. Aadhaar is recommended for faster verification.
            </p>
          </div>

          {/* Drop Zone */}
          <div
            className={`s3-dropzone ${dragOver ? "drag-over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current.click()}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPTED_FILE_EXTENSIONS}
              style={{ display: "none" }}
              onChange={handleBrowse}
            />
            <div className="s3-drop-icon-wrap">
              <span className="s3-drop-icon">📁</span>
            </div>
            <p className="s3-drop-title">Drag and drop files here</p>
            <p className="s3-drop-sub">
              Supports PDF, DOC, DOCX, JPG, PNG, and WEBP files to build your case foundation.
            </p>
            <button
              className="s3-browse-btn"
              onClick={(e) => { e.stopPropagation(); inputRef.current.click(); }}
            >
              + Browse
            </button>
            <p className="s3-drop-limit">Maximum file size: 10MB · Up to {MAX_FILES_PER_CASE} files</p>
          </div>

          {/* File validation error */}
          {fileError && <p className="s3-error">{fileError}</p>}

          {/* Uploaded Files */}
          {files.length > 0 && (
            <div className="s3-files-section">
              <h3 className="s3-files-heading">Uploaded Files ({files.length})</h3>
              <div className="s3-files-grid">
                {files.map((f, idx) => (
                  <div className="s3-file-card" key={idx}>
                    <div className="s3-file-icon-wrap">
                      <span className="s3-file-icon">{getFileIcon(f.type)}</span>
                    </div>
                    <div className="s3-file-info">
                      <span className="s3-file-name">{truncateName(f.name)}</span>
                      <span className="s3-file-meta">
                        {formatSize(f.size)} • {f.status}
                      </span>
                    </div>
                    <button
                      className="s3-file-delete"
                      onClick={() => removeFile(idx)}
                      title="Remove file"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* API submit error */}
          {submitError && !submitSuccess && (
            <div className="s3-error" style={{ marginTop: 16 }}>
              ⚠️ {submitError}
            </div>
          )}

          {/* Success confirmation */}
          {submitSuccess && (
            <div className="s3-success" style={{ marginTop: 16 }}>
              ✅ Case has been submitted successfully. Redirecting to My Cases…
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="fnc-footer">
          <button className="fnc-draft-btn" onClick={handleSaveDraft} disabled={submitting || submitSuccess}>
            <span className="fnc-btn-icon">⊞</span> Save as Draft
          </button>
          <button
            className="fnc-cancel-btn"
            onClick={() => navigate("/user/file-new-case/step2")}
            disabled={submitting || submitSuccess}
          >
            ← Back
          </button>
          <button
            className="fnc-next-btn"
            style={{ marginLeft: "auto" }}
            onClick={handleSubmit}
            disabled={submitting || submitSuccess}
          >
            {submitSuccess ? "Submitted ✓" : submitting ? "Filing Case…" : "Submit Case ✓"}
          </button>
        </div>
      </section>
    </div>
  );
};

export default FileNewCaseStep3;