import { useEffect, useState } from "react";
import { adminPaymentLinkService } from "./lib/firebase/adminPaymentLinkService";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs } from "firebase/firestore";

// Inline COUNTRIES and minimal Button/Input for admin app to resolve import errors
const COUNTRIES = [
  { code: 'IN', name: 'India', currency: 'INR', countryCode: '+91', country: 'India', flag: '🇮🇳', symbol: '₹' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN', countryCode: '+234', country: 'Nigeria', flag: '🇳🇬', symbol: '₦' },
  { code: 'US', name: 'United States', currency: 'USD', countryCode: '+1', country: 'USA', flag: '🇺🇸', symbol: '$' },
];

function Button({ children, loading, ...props }: any) {
  return (
    <button {...props} disabled={props.disabled || loading} className={"px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed " + (props.className || "")}>{loading ? "Saving..." : children}</button>
  );
}
function Input(props: any) {
  return <input {...props} className={"border px-3 py-2 rounded " + (props.className || "")}/>;
}

export default function PaymentLinkConfig() {
  const [links, setLinks] = useState<Record<string, string>>({});
  const [originalLinks, setOriginalLinks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingCountry, setSavingCountry] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingSaveCountry, setPendingSaveCountry] = useState<string | null>(null);
  const [pendingSaveValue, setPendingSaveValue] = useState<string>("");
  const [adminEmail, setAdminEmail] = useState<string>("");

  useEffect(() => {
    adminPaymentLinkService.getPaymentLinks().then((data) => {
      setLinks(data);
      setOriginalLinks(data);
      setLoading(false);
    });
  }, []);

  // Get admin email
  useEffect(() => {
    try {
      const auth = getAuth();
      setAdminEmail(auth.currentUser?.email || "");
    } catch {}
  }, []);

  // Fetch audit log
  useEffect(() => {
    const fetchAudit = async () => {
      try {
        const db = getFirestore();
        const q = query(collection(db, "paymentLinkAudit"), orderBy("timestamp", "desc"), limit(10));
        const snap = await getDocs(q);
        setAuditLog(snap.docs.map(doc => doc.data()));
      } catch {}
    };
    fetchAudit();
  }, [notification]);

  const handleChange = (country: string, value: string) => {
    setLinks((prev) => ({ ...prev, [country]: value }));
  };

  const handleSave = async (country: string) => {
    // If changing an existing value, show confirm dialog
    if (originalLinks[country] && links[country] !== originalLinks[country]) {
      setPendingSaveCountry(country);
      setPendingSaveValue(links[country] || "");
      setShowConfirm(true);
      return;
    }
    await doSave(country, links[country] || "", originalLinks[country] || "");
  };

  const doSave = async (country: string, newValue: string, oldValue: string) => {
    setSavingCountry(country);
    setNotification(null);
    try {
      await adminPaymentLinkService.setPaymentLink(country, newValue);
      setOriginalLinks((prev) => ({ ...prev, [country]: newValue }));
      // Write audit log
      try {
        const db = getFirestore();
        await addDoc(collection(db, "paymentLinkAudit"), {
          country,
          oldValue,
          newValue,
          adminEmail,
          timestamp: Date.now(),
        });
      } catch {}
      setNotification({ type: 'success', message: `Payment link for ${country} saved!` });
    } catch (e) {
      setNotification({ type: 'error', message: `Failed to save payment link for ${country}.` });
    }
    setSavingCountry(null);
    setShowConfirm(false);
    setPendingSaveCountry(null);
    setPendingSaveValue("");
  };

  if (loading) return <div>Loading payment links...</div>;

  return (
    <div className="space-y-6 max-w-xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">Configure Payment Links</h2>
      {adminEmail && <div className="mb-2 text-sm text-gray-600">Logged in as: <span className="font-mono">{adminEmail}</span></div>}
      {notification && (
        <div className={`p-2 rounded mb-2 text-sm ${notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{notification.message}</div>
      )}
      {COUNTRIES.map((country) => (
        <div key={country.country} className="mb-4">
          <label className="block font-medium mb-1">
            {country.flag} {country.country} Payment Link
          </label>
          {['Nigeria', 'USA'].includes(country.country) ? (
            <div className="flex gap-2">
              <Input
                type="url"
                value={links[country.country] || ""}
                onChange={e => handleChange(country.country, e.target.value)}
                placeholder={`Enter payment link for ${country.country}`}
                className="flex-1"
                disabled={savingCountry === country.country}
              />
              <Button
                onClick={() => handleSave(country.country)}
                disabled={
                  savingCountry === country.country ||
                  !links[country.country] ||
                  links[country.country] === originalLinks[country.country]
                }
                loading={savingCountry === country.country}
              >
                Save
              </Button>
            </div>
          ) : (
            <div className="text-gray-500 italic">UPI is used for India. No payment link required.</div>
          )}
        </div>
      ))}
      {/* Confirm dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-6 max-w-sm w-full">
            <div className="font-bold mb-2">Confirm Change</div>
            <div className="mb-4 text-sm">You are changing the payment link for <b>{pendingSaveCountry}</b>.<br/>Old value: <span className="break-all">{originalLinks[pendingSaveCountry!]}</span><br/>New value: <span className="break-all">{pendingSaveValue}</span><br/>Are you sure?</div>
            <div className="flex gap-2 justify-end">
              <Button onClick={() => { setShowConfirm(false); setPendingSaveCountry(null); setPendingSaveValue(""); }}>
                Cancel
              </Button>
              <Button loading={savingCountry === pendingSaveCountry} onClick={() => doSave(pendingSaveCountry!, pendingSaveValue, originalLinks[pendingSaveCountry!] || "")}>Confirm</Button>
            </div>
          </div>
        </div>
      )}
      {/* Audit log table */}
      <div className="mt-8">
        <h3 className="font-semibold mb-2">Recent Payment Link Changes</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs border">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-2 py-1 border">Country</th>
                <th className="px-2 py-1 border">Old Value</th>
                <th className="px-2 py-1 border">New Value</th>
                <th className="px-2 py-1 border">Admin</th>
                <th className="px-2 py-1 border">Time</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.length === 0 && (
                <tr><td colSpan={5} className="text-center p-2">No changes yet.</td></tr>
              )}
              {auditLog.map((log, i) => (
                <tr key={i}>
                  <td className="border px-2 py-1">{log.country}</td>
                  <td className="border px-2 py-1 break-all">{log.oldValue}</td>
                  <td className="border px-2 py-1 break-all">{log.newValue}</td>
                  <td className="border px-2 py-1">{log.adminEmail}</td>
                  <td className="border px-2 py-1">{log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
