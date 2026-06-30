import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { claimsApi, approvalsApi } from '../../api';

export default function ClaimReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    claimsApi.getById(id).then(r => setClaim(r.data)).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const decide = async (action) => {
    if (action === 'REJECTED' && !remarks.trim()) {
      setError('Please provide a reason for rejection.');
      return;
    }
    setError(''); setSubmitting(true);
    try {
      await approvalsApi.deanDecide(id, action, remarks);
      navigate('/dean/pending');
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed');
    } finally { setSubmitting(false); }
  };

  if (loading) return <div style={{ padding: 32, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;
  if (!claim) return <div className="alert alert-error">Claim not found.</div>;

  const isPending = claim.status === 'DEAN_PENDING';

  const STATUS_BADGE = {
    DEAN_PENDING:     { cls: 'badge-pending',  label: 'Pending Dean review' },
    DEAN_APPROVED:    { cls: 'badge-approved', label: 'Approved by Dean' },
    ACCOUNTS_PENDING: { cls: 'badge-approved', label: 'Forwarded to Accounts' },
    DEAN_REJECTED:    { cls: 'badge-rejected', label: 'Rejected by Dean' },
    PROCESSED:        { cls: 'badge-processed', label: 'Processed' },
  };
  const badge = STATUS_BADGE[claim.status] || { cls: 'badge-draft', label: claim.status };
  const deanApproval = claim.approvals?.find(a => a.stage === 'DEAN_REVIEW');

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}><i className="ti ti-arrow-left" /></button>
        <h1 className="page-title" style={{ margin: 0 }}>Review — {claim.claim_no}</h1>
        <span className={`badge ${badge.cls}`} style={{ marginLeft: 4 }}>{badge.label}</span>
      </div>

      {error && <div className="alert alert-error"><i className="ti ti-alert-circle" />{error}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">Claim details</div>
        <div className="card-body">
          <div className="form-row form-row-3" style={{ marginBottom: 12 }}>
            <div><div style={{ fontSize: 11, color: '#888' }}>Faculty (PI)</div><div style={{ fontWeight: 500, marginTop: 2 }}>{claim.faculty_name}</div><div style={{ fontSize: 12, color: '#888' }}>{claim.department}</div></div>
            <div><div style={{ fontSize: 11, color: '#888' }}>Project</div><div style={{ fontWeight: 500, marginTop: 2 }}>{claim.project_no || '—'}</div></div>
            <div><div style={{ fontSize: 11, color: '#888' }}>Budget head</div><div style={{ fontWeight: 500, marginTop: 2 }}>{claim.budget_head}</div></div>
          </div>
          <div style={{ marginBottom: 8 }}><div style={{ fontSize: 11, color: '#888' }}>Purpose</div><div style={{ marginTop: 2 }}>{claim.purpose}</div></div>
          <div><div style={{ fontSize: 11, color: '#888' }}>Submitted</div><div style={{ marginTop: 2 }}>{claim.submitted_at ? new Date(claim.submitted_at).toLocaleString('en-IN') : '—'}</div></div>
        </div>
      </div>

      <BillItemsTable items={claim.items} totalAmount={claim.total_amount} />

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">Audit trail</div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {claim.audit_logs?.map(log => (
            <div key={log.id} style={{ display: 'flex', gap: 10, fontSize: 13 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#534AB7', marginTop: 5, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 500 }}>{log.action.replace(/_/g,' ')}</div>
                <div style={{ color: '#888', fontSize: 12 }}>{log.actor_name} · {new Date(log.created_at).toLocaleString('en-IN')}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isPending ? (
        <div className="card">
          <div className="card-header">Dean decision</div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Remarks <span style={{ color: '#A32D2D' }}>(required if rejecting)</span></label>
              <textarea rows={3} value={remarks} onChange={e => setRemarks(e.target.value)}
                placeholder="Add remarks for the faculty..." />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-danger" onClick={() => decide('REJECTED')} disabled={submitting}>
                <i className="ti ti-x" style={{ marginRight: 6 }} />{submitting ? 'Processing...' : 'Reject'}
              </button>
              <button className="btn btn-success" onClick={() => decide('APPROVED')} disabled={submitting}>
                <i className="ti ti-check" style={{ marginRight: 6 }} />{submitting ? 'Processing...' : 'Approve & forward to Accounts'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">Dean decision</div>
          <div className="card-body">
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13 }}>
              <div>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Decision</div>
                <span className={`badge ${claim.status === 'DEAN_REJECTED' ? 'badge-rejected' : 'badge-approved'}`}>
                  <i className={`ti ${claim.status === 'DEAN_REJECTED' ? 'ti-circle-x' : 'ti-circle-check'}`} style={{ marginRight: 4, fontSize: 11 }} />
                  {claim.status === 'DEAN_REJECTED' ? 'Rejected' : 'Approved'}
                </span>
              </div>
              {deanApproval && (
                <>
                  <div>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Decided by</div>
                    <div style={{ fontWeight: 500 }}>{deanApproval.actor_name}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Date</div>
                    <div>{new Date(deanApproval.acted_at).toLocaleString('en-IN')}</div>
                  </div>
                </>
              )}
            </div>
            {deanApproval?.remarks && (
              <div style={{ marginTop: 14, padding: '10px 14px', background: '#fafaf9', borderRadius: 7, border: '1px solid #e5e5e3', fontSize: 13 }}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Remarks</div>
                {deanApproval.remarks}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function BillItemsTable({ items = [], totalAmount }) {
  const [selectedItem, setSelectedItem] = useState(null);

  return (
    <>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Bill items ({items.length})</span>
          <span style={{ fontSize: 11, color: '#888', fontWeight: 400 }}>
            <i className="ti ti-eye" style={{ marginRight: 4 }} />Click any row to view full details
          </span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Vendor</th>
              <th>Bill no.</th>
              <th>Date</th>
              <th>Description</th>
              <th>CGST</th>
              <th>SGST</th>
              <th>IGST</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr
                key={it.id}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedItem(it)}
              >
                <td>{i + 1}</td>
                <td>
                  {it.vendor_name}
                  {it.gstin_vendor ? (
                    <><br /><span style={{ fontSize: 11, color: '#888' }}>GSTIN: {it.gstin_vendor}</span></>
                  ) : null}
                </td>
                <td>{it.bill_no}</td>
                <td style={{ fontSize: 12 }}>{new Date(it.bill_date).toLocaleDateString('en-IN')}</td>
                <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#444' }}>
                  {it.description}
                </td>
                <td style={{ fontSize: 12 }}>{it.cgst_percent}%</td>
                <td style={{ fontSize: 12 }}>{it.sgst_percent}%</td>
                <td style={{ fontSize: 12 }}>{it.igst_percent}%</td>
                <td style={{ textAlign: 'right', fontWeight: 500 }}>₹{parseFloat(it.total_amount).toLocaleString('en-IN')}</td>
                <td>
                  <button
                    className="btn btn-ghost btn-sm"
                    title="View full details"
                    onClick={e => { e.stopPropagation(); setSelectedItem(it); }}
                    style={{ padding: '4px 8px' }}
                  >
                    <i className="ti ti-eye" style={{ fontSize: 14 }} />
                  </button>
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={8} style={{ textAlign: 'right', fontWeight: 500 }}>Claim total</td>
              <td style={{ textAlign: 'right', fontWeight: 600, color: '#534AB7', fontSize: 15 }}>
                ₹{parseFloat(totalAmount || 0).toLocaleString('en-IN')}
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      {selectedItem && (
        <ItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </>
  );
}

function ItemDetailModal({ item, onClose }) {
  const base     = parseFloat(item.unit_price || 0) * parseFloat(item.quantity || 1);
  const cgstAmt  = (base * parseFloat(item.cgst_percent || 0)) / 100;
  const sgstAmt  = (base * parseFloat(item.sgst_percent || 0)) / 100;
  const igstAmt  = (base * parseFloat(item.igst_percent || 0)) / 100;
  const total    = parseFloat(item.total_amount || 0);

  const Field = ({ label, value, full }) => (
    <div style={{ gridColumn: full ? '1 / -1' : undefined }}>
      <div style={{ fontSize: 11, color: '#888', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 13, color: '#1a1a1a', lineHeight: 1.6, wordBreak: 'break-word' }}>{value || '—'}</div>
    </div>
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
        backdropFilter: 'blur(3px)',
        animation: 'modalFadeIn 0.15s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 14,
          width: '100%',
          maxWidth: 620,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          animation: 'modalSlideUp 0.18s ease',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid #e5e5e3',
          position: 'sticky', top: 0, background: '#fff', zIndex: 1,
          borderRadius: '14px 14px 0 0',
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Bill Item Details</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Bill no. {item.bill_no}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#f5f5f4', border: 'none', borderRadius: 8,
              width: 32, height: 32, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#555', fontSize: 16, transition: 'background 0.12s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#e5e5e3'}
            onMouseLeave={e => e.currentTarget.style.background = '#f5f5f4'}
          >
            <i className="ti ti-x" />
          </button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#534AB7', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <i className="ti ti-building-store" style={{ marginRight: 6 }} />Vendor Information
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
              <Field label="Vendor Name" value={item.vendor_name} />
              <Field label="GSTIN" value={item.gstin_vendor} />
            </div>
          </div>

          <div style={{ borderTop: '1px solid #f0f0ee' }} />

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#534AB7', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <i className="ti ti-file-invoice" style={{ marginRight: 6 }} />Bill Information
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
              <Field label="Bill Number" value={item.bill_no} />
              <Field
                label="Bill Date"
                value={item.bill_date
                  ? new Date(item.bill_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
                  : '—'}
              />
              <Field label="Description" value={item.description} full />
            </div>
          </div>

          <div style={{ borderTop: '1px solid #f0f0ee' }} />

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#534AB7', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <i className="ti ti-calculator" style={{ marginRight: 6 }} />Pricing Breakdown
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
              <Field label="Quantity" value={item.quantity} />
              <Field label="Unit Price" value={`₹${parseFloat(item.unit_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
              <Field label="Base Amount (Qty × Unit)" value={`₹${base.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
              <div />
              <Field label={`CGST @ ${item.cgst_percent}%`} value={`₹${cgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
              <Field label={`SGST @ ${item.sgst_percent}%`} value={`₹${sgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
              {parseFloat(item.igst_percent) > 0 && (
                <Field label={`IGST @ ${item.igst_percent}%`} value={`₹${igstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
              )}
            </div>
          </div>

          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: '#EEEDFE', borderRadius: 10, padding: '14px 18px',
          }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#534AB7' }}>Total Amount (incl. GST)</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#534AB7' }}>
              ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalFadeIn  { from { opacity: 0 }                       to { opacity: 1 } }
        @keyframes modalSlideUp { from { transform: translateY(24px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </div>
  );
}