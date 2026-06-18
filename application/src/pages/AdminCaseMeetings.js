// src/pages/AdminMeetings.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBell, FaSearch, FaChevronDown, FaChevronUp,
  FaChevronLeft, FaChevronRight, FaSync, FaVideo,
} from "react-icons/fa";
import api from "../api/axios";
import AdminSidebar from "../components/AdminSidebar";
import "./AdminCaseMeetings.css";

/* ─── Constants ─── */
const STATUS_OPTIONS = ["All Statuses","Ongoing","Upcoming","Missed","Completed","Cancelled"];
const ROWS_OPTIONS   = [5,10,20,50];

/* ─── Helpers ─── */
const fmtDate = d => d ? new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"2-digit",year:"numeric"}) : "—";
const fmt12   = t => { if(!t) return "—"; const [h,m]=t.split(":").map(Number); return `${h%12||12}:${String(m).padStart(2,"0")} ${h>=12?"PM":"AM"}`; };

const getStatusDot = s => {
  if(s==="Ongoing")   return "adm3-dot--green";
  if(s==="Upcoming")  return "adm3-dot--yellow";
  if(s==="Missed")    return "adm3-dot--red";
  if(s==="Completed") return "adm3-dot--blue";
  return "adm3-dot--grey";
};

/* ─── Dropdown ─── */
const Dropdown = ({options,value,onChange}) => {
  const [open,setOpen] = useState(false);
  const ref = useRef();
  useEffect(()=>{ const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);}; document.addEventListener("mousedown",h); return()=>document.removeEventListener("mousedown",h); },[]);
  return (
    <div className="adm3-dd" ref={ref}>
      <button className={`adm3-dd__trigger ${open?"open":""}`} onClick={()=>setOpen(p=>!p)}>
        <span>{value}</span>
        {open?<FaChevronUp className="adm3-dd__chev"/>:<FaChevronDown className="adm3-dd__chev"/>}
      </button>
      {open&&(
        <div className="adm3-dd__menu">
          {options.map(o=>(
            <div key={o} className="adm3-dd__item" onClick={()=>{onChange(o);setOpen(false);}}>
              <span>{o}</span>
              <span className={`adm3-radio ${value===o?"adm3-radio--on":""}`}/>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Action button logic ─── */
const MeetingActionBtn = ({meeting, onJoin}) => {
  if(meeting.status==="Ongoing") return (
    <button className="adm3-action-btn adm3-action-btn--join" onClick={()=>onJoin(meeting)}>
      <FaVideo style={{marginRight:6}}/> Join Meeting
    </button>
  );
  if(meeting.status==="Upcoming") return (
    <button className="adm3-action-btn adm3-action-btn--prejoin" onClick={()=>onJoin(meeting)}>
      Pre-Join
    </button>
  );
  if(meeting.status==="Missed"||meeting.status==="Completed") return (
    <button
      className="adm3-action-btn adm3-action-btn--recording"
      disabled
      title="Recordings not available (live video not yet implemented)"
      style={{ opacity: 0.45, cursor: "not-allowed" }}
    >
      No Recording
    </button>
  );
  return <span className="adm3-action-dash">—</span>;
};

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
const AdminMeetings = () => {
  const navigate = useNavigate();
  const [search,        setSearch]        = useState("");
  const [meetings,      setMeetings]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [filterStatus,  setFilterStatus]  = useState("All Statuses");
  const [page,          setPage]          = useState(1);
  const [rowsPerPage,   setRowsPerPage]   = useState(10);
  const fetchMeetings = useCallback(async()=>{
    setLoading(true);
    try {
      const res = await api.get("/meetings/all");
      const raw = res.data.meetings||[];
      // map backend shape to local shape
      setMeetings(raw.map(m=>({
        _id:          m._id,
        meetingId:    `#${m._id?.slice(-4)||"0000"}`,
        caseId:       m.caseId?.caseId||"—",
        meetingTitle: m.caseId?.caseTitle||m.meetingTitle||"—",
        petitioner:   m.participants?.find(p=>p.role==="Petitioner")?.name||"—",
        respondent:   m.participants?.find(p=>p.role==="Respondent")?.name||"—",
        mediator:     m.mediator?.name||m.mediator?.fullName||"—",
        status:       m.status||"Upcoming",
        scheduledDate:m.scheduledDate,
        startTime:    m.startTime,
        endTime:      m.endTime,
        virtualMeeting:m.virtualMeeting,
      })));
    } catch {
      setMeetings([]);
    } finally { setLoading(false); }
  },[]);

  useEffect(()=>{
    if(!localStorage.getItem("token")){navigate("/login");return;}
    fetchMeetings();
  },[navigate,fetchMeetings]);

  /* filter */
  const filtered = meetings.filter(m=>{
    const q=search.toLowerCase();
    const ms=!search||m.meetingId.toLowerCase().includes(q)||m.caseId.toLowerCase().includes(q)||m.meetingTitle.toLowerCase().includes(q)||m.mediator.toLowerCase().includes(q)||m.petitioner.toLowerCase().includes(q);
    const mSt = filterStatus==="All Statuses"||m.status===filterStatus;
    return ms&&mSt;
  });

  const activeFilters=[];
  if(filterStatus!=="All Statuses")  activeFilters.push({key:"st", label:filterStatus, clear:()=>setFilterStatus("All Statuses")});

  const totalPages = Math.max(1,Math.ceil(filtered.length/rowsPerPage));
  const paginated  = filtered.slice((page-1)*rowsPerPage, page*rowsPerPage);

  const handleJoin = (meeting) => {
    navigate(`/admin/meetings/lobby/${meeting._id}`);
  };

  return (
    <div className="adm3-root">
      <AdminSidebar/>

      <main className="adm3-main">
        {/* Topbar */}
        <header className="adm3-topbar">
          <div className="adm3-search">
            <FaSearch className="adm3-search__icon"/>
            <input className="adm3-search__input" placeholder="Search cases, mediators or meetings…"
              value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/>
          </div>
          <div className="adm3-topbar__right">
            <button className="adm3-topbar__bell"><FaBell/></button>
            <img src="https://ui-avatars.com/api/?name=Admin&background=778aff&color=fff&size=80"
              alt="admin" className="adm3-topbar__avatar"/>
          </div>
        </header>

        <div className="adm3-body">
          {/* Header */}
          <div className="adm3-page-header">
            <div>
              <h2 className="adm3-page-title">Meetings</h2>
              <p className="adm3-page-sub">Manage and monitor all mediation sessions</p>
            </div>
            <button className="adm3-refresh-btn" onClick={fetchMeetings} title="Refresh"><FaSync/></button>
          </div>

          {/* Filters */}
          <div className="adm3-filters">
            <div className="adm3-filter-group">
              <label className="adm3-filter-lbl">STATUS</label>
              <Dropdown options={STATUS_OPTIONS} value={filterStatus} onChange={v=>{setFilterStatus(v);setPage(1);}}/>
            </div>
          </div>

          {/* Active tags */}
          {activeFilters.length>0&&(
            <div className="adm3-active-filters">
              <span className="adm3-active-filters__lbl">Active Filters:</span>
              {activeFilters.map(f=>(
                <span key={f.key} className="adm3-filter-tag">
                  {f.label}
                  <button className="adm3-filter-tag__x" onClick={f.clear}>×</button>
                </span>
              ))}
              <button className="adm3-clear-all" onClick={()=>{setFilterStatus("All Statuses");}}>
                Clear All
              </button>
            </div>
          )}

          {/* Table */}
          <div className="adm3-table-card">
            {loading ? (
              <div className="adm3-table-empty">Loading meetings…</div>
            ) : (
              <table className="adm3-table">
                <thead>
                  <tr>
                    <th>MEETING ID</th><th>CASE ID</th><th>TOPIC</th>
                    <th>PARTICIPANTS</th><th>MEDIATOR</th>
                    <th>STATUS</th><th>DATE &amp; TIME</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length===0?(
                    <tr><td colSpan={8} className="adm3-table-empty">
                      {search||activeFilters.length>0?"No meetings match your filters.":"No meetings found."}
                    </td></tr>
                  ):paginated.map(m=>(
                    <tr key={m._id}>
                      <td className="adm3-table__mid">{m.meetingId}</td>
                      <td className="adm3-table__cid">{m.caseId}</td>
                      <td>{m.meetingTitle}</td>
                      <td className="adm3-table__participants">
                        <span className="adm3-p-role">(Petitioner)</span>
                        <span className="adm3-p-name">{m.petitioner}</span>
                        <span className="adm3-p-role">(Respondent)</span>
                        <span className="adm3-p-name">{m.respondent}</span>
                      </td>
                      <td>{m.mediator}</td>
                      <td>
                        <span className="adm3-status-cell">
                          <span className={`adm3-dot ${getStatusDot(m.status)}`}/>
                          {m.status}
                        </span>
                      </td>
                      <td className="adm3-table__dt">
                        <span className="adm3-dt-date">{fmtDate(m.scheduledDate)}</span>
                        <span className="adm3-dt-time">{fmt12(m.startTime)} – {fmt12(m.endTime)}</span>
                      </td>
                      <td><MeetingActionBtn meeting={m} onJoin={handleJoin}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Pagination */}
            <div className="adm3-pagination">
              <div className="adm3-pagination__left">
                <span className="adm3-pagination__lbl">Rows per page:</span>
                <Dropdown options={ROWS_OPTIONS.map(String)} value={String(rowsPerPage)}
                  onChange={v=>{setRowsPerPage(Number(v));setPage(1);}}/>
              </div>
              <div className="adm3-pagination__right">
                <span className="adm3-pagination__info">
                  {filtered.length===0?"0":`${(page-1)*rowsPerPage+1}–${Math.min(page*rowsPerPage,filtered.length)}`} of {filtered.length} Meetings
                </span>
                <button className="adm3-pagination__btn" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}><FaChevronLeft/></button>
                <button className="adm3-pagination__btn" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}><FaChevronRight/></button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminMeetings;