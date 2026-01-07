import React, { useState, useEffect } from 'react';
import { Activity, UploadCloud, AlertOctagon, X, FileCheck, LogOut, LayoutDashboard, FileText } from 'lucide-react';
import { CovenantRules, SAPEntry, ReconciliationItem, FinancialHealth, HeadroomMetrics, CertificateStatus } from './types';
import { MOCK_SAP_DATA, SAMPLE_LMA_TEXT } from './constants';
import { analyzeLMAAgreement, generateComplianceCertificateData } from './services/geminiService';
import { runReconciliation } from './services/reconciliationEngine';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
import { saveCertificate, uploadAgreement, uploadComplianceCertificate, getAgreementFile, saveComplianceArtifact, getLatestComplianceArtifact, updateCertificateStatus } from './services/supabaseService';
import { generateComplianceCertificatePDF } from './services/pdfService';

// Components
import Auth from './components/Auth';
import DashboardView from './components/DashboardView';

enum AppState {
  AUTH,
  BORROWER_UPLOAD,
  BORROWER_PROCESSING,
  BORROWER_DASHBOARD,
  BORROWER_CERTIFICATE_LIST,
  AGENT_LIST,
  VIEW_CERTIFICATE
}

// Minimal Interface for List View
interface CertificateRecord {
    id: string;
    borrower_name: string;
    facility_agent: string;
    period: string;
    status: CertificateStatus;
    created_at: string;
    data: {
        covenants: CovenantRules;
        health: FinancialHealth;
        headroom: HeadroomMetrics;
        reconciliation: ReconciliationItem[];
    };
    document_url?: string;
}

const App: React.FC = () => {
  const statusStyles: Record<CertificateStatus, string> = {
    draft: 'bg-amber-100 text-amber-800',
    submitted: 'bg-emerald-100 text-emerald-800',
  };

  // Auth State
  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<'borrower' | 'agent' | null>(null);

  // App Flow State
  const [viewState, setViewState] = useState<AppState>(AppState.AUTH);
  const [loading, setLoading] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Borrower Data State
  const [lmaText, setLmaText] = useState<string>(SAMPLE_LMA_TEXT);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadedDocUrl, setUploadedDocUrl] = useState<string | null>(null);
  const [currentCertificateId, setCurrentCertificateId] = useState<string | null>(null);
  const [lastGeneratedCertUrl, setLastGeneratedCertUrl] = useState<string | null>(null);
  const [covenants, setCovenants] = useState<CovenantRules | null>(null);
  const [sapData, setSapData] = useState<SAPEntry[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationItem[]>([]);
  const [health, setHealth] = useState<FinancialHealth | null>(null);
  const [headroom, setHeadroom] = useState<HeadroomMetrics | null>(null);

  // Agent Data State
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateRecord | null>(null);

  useEffect(() => {
    // 1. Initial Session Check
    const checkInitialSession = async () => {
      if (!isSupabaseConfigured()) return;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSession(session);
        const role = session.user.user_metadata?.role || 'borrower';
        setUserRole(role);
        
        // Navigate to appropriate view
        if (role === 'agent') {
            setViewState(AppState.AGENT_LIST);
            // We'll call fetchCertificates in another useEffect or inside here
        } else {
            setViewState(AppState.BORROWER_UPLOAD);
        }
      }
    };

    checkInitialSession();

    // 2. Auth Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        const role = session.user.user_metadata?.role || 'borrower';
        setUserRole(role);
      } else {
        setUserRole(null);
        setViewState(AppState.AUTH);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch certificates when role/session changes and we are in a list view
  useEffect(() => {
    if (session && userRole) {
        if (viewState === AppState.AGENT_LIST || viewState === AppState.BORROWER_CERTIFICATE_LIST) {
            fetchCertificates();
        }
    }
  }, [session, userRole, viewState]);

  // AUTH HANDLERS
  const handleLogin = (session: any, role: string) => {
      setSession(session);
      setUserRole(role as 'borrower' | 'agent');
      setLastGeneratedCertUrl(null);
      if (role === 'agent') {
        fetchCertificates();
        setViewState(AppState.AGENT_LIST);
      } else {
        setViewState(AppState.BORROWER_UPLOAD);
      }
  };

  const handleLogout = async () => {
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut();
      }
      setSession(null);
      setUserRole(null);
      setViewState(AppState.AUTH);
      // Reset State
      setCovenants(null);
      setCertificates([]);
      setUploadedDocUrl(null);
  };

  // AGENT FETCHING
  const fetchCertificates = async () => {
      setLoading(true);
      if (isSupabaseConfigured()) {
        let query = supabase.from('certificates').select('*').order('created_at', { ascending: false });
        
        // For borrowers, we still only show their own in their list view
        if (userRole === 'borrower') {
            query = query.eq('user_id', session.user.id);
        }
        // For agents, we show EVERYTHING (no filter applied)

        const { data, error } = await query;
        if (!error && data) {
            setCertificates(data as CertificateRecord[]);
        } else {
            console.error("Fetch error", error);
        }
      } else {
          // Demo Mode - no fetch
      }
      setLoading(false);
  };

  const handleSelectCertificate = async (cert: CertificateRecord) => {
      // In a real app we might fetch the specific big JSON blob here if we didn't fetch it in the list
      // For now assuming we have it
      setSelectedCertificate(cert);
      setCurrentCertificateId(cert.id);
      setLastGeneratedCertUrl(null);

      // Check if there are any generated compliance certificates for this record
      if (isSupabaseConfigured()) {
          const latestUrl = await getLatestComplianceArtifact(cert.id);
          if (latestUrl) {
              setLastGeneratedCertUrl(latestUrl);
          }
      }

      // If demo mode and data is empty, we might need to regenerate/mock it, 
      // but for simplicity let's assume demo users go through borrower flow first or we use the MOCK constants.
      if (!cert.data || Object.keys(cert.data.covenants).length === 0) {
         // Fallback for demo display purposes if the record is a stub
         setError("This is a demo stub. Real data would load here.");
      } else {
         setCovenants(cert.data.covenants);
         setHealth(cert.data.health);
         setHeadroom(cert.data.headroom);
         setReconciliation(cert.data.reconciliation);
         setViewState(AppState.VIEW_CERTIFICATE);
      }
  };


  // BORROWER ACTIONS
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf') {
        setPdfFile(file);
        setError(null);
      } else {
        setError("Only PDF files are supported.");
      }
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleProcessAgreement = async () => {
    setViewState(AppState.BORROWER_PROCESSING);
    setProcessingStep('Initializing Ingestion Agent...');
    setLastGeneratedCertUrl(null);
    
    try {
      // Step 1: Upload to Cloud Storage (if enabled)
      let docUrl = null;
      if (pdfFile && isSupabaseConfigured()) {
        setProcessingStep('Uploading Agreement to Secure Storage...');
        try {
            docUrl = await uploadAgreement(pdfFile, session.user.id);
            setUploadedDocUrl(docUrl);
        } catch (uploadErr) {
            console.error("Upload failed", uploadErr);
            // Proceed even if upload fails? Or stop? 
            // For now, let's proceed but warn.
            setProcessingStep('Upload failed. Proceeding with analysis...');
        }
      }

      // Step 2: Gemini Analysis
      setProcessingStep('Gemini Agent analyzing Agreement...');
      let input: string | { data: string, mimeType: string } = lmaText;
      let currentPdfData: { name: string, data: string } | null = null;
      
      if (pdfFile) {
        setProcessingStep('Reading PDF Document...');
        const base64Data = await fileToBase64(pdfFile);
        input = { data: base64Data, mimeType: 'application/pdf' };
        currentPdfData = { name: pdfFile.name, data: base64Data };
        setProcessingStep('Gemini Agent analyzing PDF Content...');
      }

      const extractedRules = await analyzeLMAAgreement(input);
      // We no longer attach sourceDocument (base64) to the rules object 
      // as we are using the uploadedDocUrl now.

      setCovenants(extractedRules);

      // Step 3: ERP Connection
      setProcessingStep('Connecting to SAP ERP (Mock Interface)...');
      await new Promise(resolve => setTimeout(resolve, 1500)); 
      setSapData(MOCK_SAP_DATA);

      // Step 4: Reconciliation
      setProcessingStep('Running Reconciliation Engine...');
      const result = runReconciliation(MOCK_SAP_DATA, extractedRules);
      
      setReconciliation(result.reconciliation);
      setHealth(result.health);
      setHeadroom(result.headroom);

      // Save the extracted data to Supabase
      if (isSupabaseConfigured()) {
        const savedRecord = await saveCertificate(
          session.user.id,
          extractedRules.dealMetadata.borrower || 'Unknown Borrower',
          extractedRules.dealMetadata.facilityAgent || 'Unknown Agent',
          'Q1 2025', // Should be dynamic
          extractedRules,
          result.health,
          result.headroom,
          result.reconciliation,
          docUrl,
          'draft'
        );
        if (savedRecord) setCurrentCertificateId(savedRecord.id);
      }

      setProcessingStep('Complete.');
      setTimeout(() => setViewState(AppState.BORROWER_DASHBOARD), 800);

    } catch (err) {
      console.error(err);
      setError("Failed to process agreement.");
      setViewState(AppState.BORROWER_UPLOAD);
    }
  };

  const handlePrepareCertificate = async () => {
    if (!covenants || !health || !headroom) {
      setError("Incomplete data to generate certificate.");
      return;
    }

    setIsPreparing(true);
    setLoading(true);
    setProcessingStep('Retrieving original Agreement PDF...');
    
    try {
      let agreementInput: string | { data: string, mimeType: string } = lmaText;
      
      if (uploadedDocUrl) {
        const agreementBlob = await getAgreementFile(uploadedDocUrl);
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(agreementBlob);
        });
        const base64Data = await base64Promise;
        agreementInput = { data: base64Data, mimeType: 'application/pdf' };
      }

      setProcessingStep('Gemini Agent generating Schedule 7 JSON data...');
      const certData = await generateComplianceCertificateData(
        agreementInput,
        health,
        headroom,
        reconciliation,
        covenants,
        'Q1 2026'
      );

      setProcessingStep('Generating Compliance Certificate PDF...');
      const blob = await generateComplianceCertificatePDF(certData);
      
      if (!isSupabaseConfigured()) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `compliance_certificate_${Date.now()}.pdf`;
        a.click();
        return;
      }

      const docUrl = await uploadComplianceCertificate(blob, session.user.id);
      
      // Store the artifact in the child table if we have a certificate record
      if (currentCertificateId && isSupabaseConfigured()) {
        await saveComplianceArtifact(currentCertificateId, docUrl, 'compliance_certificate');
      }
      
      setLastGeneratedCertUrl(docUrl);
    } catch (err) {
      console.error(err);
      setError("Failed to generate or upload compliance certificate.");
    } finally {
      setLoading(false);
      setIsPreparing(false);
    }
  };

  const handleSubmitCertificate = async () => {
    if (!session || !currentCertificateId) return;
    setLoading(true);
    
    try {
      if (isSupabaseConfigured()) {
        await updateCertificateStatus(currentCertificateId, 'submitted');
        
        alert("Certificate Submitted Successfully to Facility Agent.");
        
        // Reset flow and go back to list
        setCovenants(null);
        setUploadedDocUrl(null);
        setCurrentCertificateId(null);
        setLastGeneratedCertUrl(null);
        setViewState(AppState.BORROWER_CERTIFICATE_LIST);
      } else {
        // Demo persistence
        alert("Demo Mode: Certificate Status marked as 'Submitted'. (Data not persisted)");
        setCovenants(null);
        setUploadedDocUrl(null);
        setViewState(AppState.BORROWER_UPLOAD);
      }
    } catch (error) {
      setError("Failed to submit certificate: " + error.message);
    } finally {
      setLoading(false);
    }
  };


  // RENDER HELPERS
  if (viewState === AppState.AUTH) {
      return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans">
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed h-full z-10 hidden md:flex">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xl">
            <Activity />
            <span>Syndicate<span className="text-slate-900">Bridge</span></span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Role: <span className="font-semibold uppercase text-emerald-600">{userRole}</span>
          </p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {userRole === 'borrower' && (
            <>
              <button 
                  onClick={() => setViewState(AppState.BORROWER_UPLOAD)}
                  className={`flex items-center gap-3 px-4 py-3 w-full rounded-lg transition-all ${viewState === AppState.BORROWER_UPLOAD ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                  <UploadCloud size={20} />
                  <span className="font-medium">New Agreement</span>
              </button>
              <button
                  onClick={() => { fetchCertificates(); setViewState(AppState.BORROWER_CERTIFICATE_LIST); }}
                  className={`flex items-center gap-3 px-4 py-3 w-full rounded-lg transition-all ${viewState === AppState.BORROWER_CERTIFICATE_LIST ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                  <LayoutDashboard size={20} />
                  <span className="font-medium">Loan Agreements</span>
              </button>
            </>
          )}

          {userRole === 'agent' && (
             <button 
                onClick={() => { fetchCertificates(); setViewState(AppState.AGENT_LIST); }}
                className={`flex items-center gap-3 px-4 py-3 w-full rounded-lg transition-all ${viewState === AppState.AGENT_LIST ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-slate-500 hover:bg-slate-50'}`}
             >
                <LayoutDashboard size={20} />
                <span className="font-medium">Loan Agreements</span>
             </button>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100">
           <button onClick={handleLogout} className="flex items-center gap-2 text-slate-500 hover:text-red-600 transition-colors w-full px-4 py-2">
             <LogOut size={16} />
             <span>Sign Out</span>
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-8 overflow-y-auto">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
               {viewState === AppState.BORROWER_UPLOAD && 'Compliance Certificate Setup'}
               {viewState === AppState.BORROWER_DASHBOARD && 'Review & Submit'}
               {viewState === AppState.BORROWER_CERTIFICATE_LIST && 'My Loan Agreements'}
               {viewState === AppState.AGENT_LIST && 'Loan Agreements'}
               {viewState === AppState.VIEW_CERTIFICATE && 'Loan Agreement'}
            </h1>
            <p className="text-slate-500">
               {userRole === 'borrower' ? 'Prepare and submit your quarterly compliance data.' : 'Review incoming certificates from borrowers.'}
            </p>
          </div>
          {viewState === AppState.VIEW_CERTIFICATE && (
              <button onClick={() => setViewState(userRole === 'borrower' ? AppState.BORROWER_CERTIFICATE_LIST : AppState.AGENT_LIST)} className="px-4 py-2 border rounded-lg hover:bg-slate-100 text-sm">
                  Back to List
              </button>
          )}
        </header>

        {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 flex items-center gap-3">
                <AlertOctagon />
                {error}
                <button onClick={() => setError(null)} className="ml-auto hover:text-red-900 underline">Dismiss</button>
            </div>
        )}

        {/* --- VIEW: BORROWER CERTIFICATE LIST --- */}
        {viewState === AppState.BORROWER_CERTIFICATE_LIST && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-500">
                        <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Borrower</th>
                                <th className="px-6 py-4">Facility Agent</th>
                                <th className="px-6 py-4">Period</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Submitted</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && (
                                <tr>
                                    <td colSpan={6} className="p-0 h-1 bg-slate-100 overflow-hidden">
                                        <div className="h-full bg-emerald-500 animate-progress origin-left w-full"></div>
                                    </td>
                                </tr>
                            )}
                            {!loading && certificates.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400 italic">No certificates found.</td>
                                </tr>
                            ) : (
                                certificates.map((cert) => (
                                    <tr key={cert.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900">{cert.borrower_name}</td>
                                        <td className="px-6 py-4">{cert.facility_agent || '-'}</td>
                                        <td className="px-6 py-4">{cert.period}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${statusStyles[cert.status] || 'bg-slate-100 text-slate-800'}`}>
                                                {cert.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">{new Date(cert.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => handleSelectCertificate(cert)}
                                                className="text-emerald-600 hover:text-emerald-800 font-medium hover:underline"
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* --- VIEW: AGENT LIST --- */}
        {viewState === AppState.AGENT_LIST && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-500">
                        <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Borrower</th>
                                <th className="px-6 py-4">Facility Agent</th>
                                <th className="px-6 py-4">Period</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Submitted</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && (
                                <tr>
                                    <td colSpan={6} className="p-0 h-1 bg-slate-100 overflow-hidden">
                                        <div className="h-full bg-emerald-500 animate-progress origin-left w-full"></div>
                                    </td>
                                </tr>
                            )}
                            {!loading && certificates.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400 italic">No certificates found.</td>
                                </tr>
                            ) : (
                                certificates.map((cert) => (
                                    <tr key={cert.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900">{cert.borrower_name}</td>
                                        <td className="px-6 py-4">{cert.facility_agent || '-'}</td>
                                        <td className="px-6 py-4">{cert.period}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${statusStyles[cert.status] || 'bg-slate-100 text-slate-800'}`}>
                                                {cert.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">{new Date(cert.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => handleSelectCertificate(cert)}
                                                className="text-emerald-600 hover:text-emerald-800 font-medium hover:underline"
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* --- VIEW: BORROWER UPLOAD --- */}
        {viewState === AppState.BORROWER_UPLOAD && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-lg">
              <div className="mb-6 flex items-center gap-4">
                <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
                  <FileText size={32} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">LMA Facility Agreement</h2>
                  <p className="text-sm text-slate-500">Upload PDF to begin extraction.</p>
                </div>
              </div>

              <div className="space-y-6">
                {!pdfFile ? (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <UploadCloud className="w-10 h-10 mb-3 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                      <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">Click to upload</span> or drag and drop PDF</p>
                    </div>
                    <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
                  </label>
                ) : (
                  <div className="flex items-center justify-between w-full p-4 border border-emerald-200 bg-emerald-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileCheck className="text-emerald-600" size={24} />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{pdfFile.name}</p>
                        <p className="text-xs text-emerald-700/80">{(pdfFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button onClick={() => setPdfFile(null)} className="p-2 hover:bg-white rounded-full text-slate-500 hover:text-red-500 transition-colors">
                      <X size={20} />
                    </button>
                  </div>
                )}
                
                <div className="flex items-center gap-4">
                    <div className="h-px bg-slate-200 flex-1"></div>
                    <span className="text-slate-400 text-xs uppercase font-bold">Or Paste Text</span>
                    <div className="h-px bg-slate-200 flex-1"></div>
                </div>

                <textarea 
                  className={`w-full h-48 bg-slate-50 border border-slate-300 rounded-lg p-4 font-mono text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none ${pdfFile ? 'opacity-50 cursor-not-allowed' : ''}`}
                  value={lmaText}
                  onChange={(e) => setLmaText(e.target.value)}
                  placeholder={pdfFile ? "File selected." : "Paste agreement text..."}
                  disabled={!!pdfFile}
                />
              </div>

              <div className="mt-8 flex justify-end">
                <button 
                  onClick={handleProcessAgreement}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-transform active:scale-95 shadow-lg shadow-emerald-500/20"
                >
                  <Activity size={18} />
                  Extract & Process
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- VIEW: PROCESSING --- */}
        {viewState === AppState.BORROWER_PROCESSING && (
          <div className="h-[60vh] flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mb-6"></div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Analyzing Agreement</h2>
            <p className="text-emerald-600 animate-pulse">{processingStep}</p>
          </div>
        )}

        {/* --- VIEW: DASHBOARDS (Borrower & Agent) --- */}
        {(viewState === AppState.BORROWER_DASHBOARD || viewState === AppState.VIEW_CERTIFICATE) && covenants && headroom && health && (
            <DashboardView 
                covenants={covenants}
                headroom={headroom}
                health={health}
                reconciliation={reconciliation}
                userRole={userRole || 'borrower'}
                status={viewState === AppState.BORROWER_DASHBOARD ? 'draft' : selectedCertificate?.status}
                lastGeneratedCertUrl={lastGeneratedCertUrl}
                onSave={handleSubmitCertificate}
                onPrepareCertificate={handlePrepareCertificate}
                isSaving={loading}
                isPreparing={isPreparing}
                readOnly={viewState === AppState.VIEW_CERTIFICATE && selectedCertificate?.status === 'submitted'}
                documentUrl={uploadedDocUrl || selectedCertificate?.document_url}
            />
        )}
      </main>
    </div>
  );
};

export default App;