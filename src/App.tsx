import { useState, useRef, type FormEvent, type ChangeEvent } from "react";
import { Search, Printer, Trash2, Upload, User, FileText, MapPin, Clock, Briefcase, AlertCircle, CheckCircle2, Loader2, Download } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Teacher {
  rfc: string;
  curp: string;
  nombre_completo: string;
  clave_presupuestal: string;
  horas_base: number;
  horas_totales: number;
  categoria: string;
  centro_trabajo: string;
}

export default function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setResults(data);
      if (data.length === 0) {
        setMessage({ text: "No se encontraron resultados", type: "error" });
      } else {
        setMessage(null);
      }
    } catch (error) {
      console.error("Search error:", error);
      setMessage({ text: "Error al realizar la búsqueda", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setResults([]);
    setMessage(null);
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload-csv", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        setMessage({ text: `Base de datos actualizada: ${data.count} registros cargados`, type: "success" });
      } else {
        setMessage({ text: data.error || "Error al cargar el archivo", type: "error" });
      }
    } catch (error) {
      console.error("Upload error:", error);
      setMessage({ text: "Error de conexión al cargar el archivo", type: "error" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (results.length === 0) return;

    const headers = ["RFC", "CURP", "NOMBRE_COMPLETO", "CLAVE_PRESUPUESTAL", "HORAS_BASE", "HORAS_TOTALES", "CATEGORIA", "CENTRO_TRABAJO"];
    const csvRows = results.map(t => [
      t.rfc,
      t.curp,
      `"${t.nombre_completo}"`,
      t.clave_presupuestal,
      t.horas_base,
      t.horas_totales,
      `"${t.categoria}"`,
      `"${t.centro_trabajo}"`
    ].join(","));

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `busqueda_maestros_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {/* Header */}
      <header className="bg-guinda text-white py-6 px-4 shadow-lg no-print">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-lg">
              <Briefcase className="text-guinda w-8 h-8" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              BUSCADOR PARA TRÁMITE Y CONTROL EDUCACIÓN FÍSICA SEGEY
            </h1>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-all border border-white/20 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span className="hidden sm:inline">Actualizar CSV</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv"
              className="hidden"
            />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8">
        {/* Search Section */}
        <section className="no-print mb-8">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por RFC, CURP, Nombre, Clave..."
                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-guinda focus:ring-0 outline-none transition-all text-lg"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 md:flex-none bg-guinda hover:bg-guinda-dark text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-md flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                Buscar
              </button>
              <button
                type="button"
                onClick={clearSearch}
                className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-3 rounded-xl transition-all"
                title="Limpiar búsqueda"
              >
                <Trash2 className="w-6 h-6" />
              </button>
              {results.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl transition-all shadow-md"
                    title="Exportar a CSV"
                  >
                    <Download className="w-6 h-6" />
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-xl transition-all shadow-md"
                    title="Imprimir resultados"
                  >
                    <Printer className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>
          </form>

          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`mt-4 p-4 rounded-xl flex items-center gap-3 ${
                  message.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {message.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                <p className="font-medium">{message.text}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Results Section */}
        <section className="print-container">
          <div className="hidden print-only mb-8 text-center border-b-2 border-guinda pb-4">
            <h1 className="text-2xl font-bold text-guinda uppercase">
              Reporte de Búsqueda - Educación Física SEGEY
            </h1>
            <p className="text-gray-600 mt-1">Fecha: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="space-y-4">
            {results.map((teacher, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white border-2 border-gray-100 rounded-2xl p-4 md:p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group"
              >
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-guinda opacity-0 group-hover:opacity-100 transition-opacity" />
                
                {/* Single line display for mobile/scannable view, but structured for clarity */}
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-guinda/10 p-2 rounded-full">
                        <User className="text-guinda w-5 h-5" />
                      </div>
                      <h3 className="text-xl font-bold text-guinda uppercase">{teacher.nombre_completo}</h3>
                    </div>
                    <div className="flex items-center gap-2 bg-guinda text-white px-4 py-1 rounded-full text-sm font-bold">
                      <Clock className="w-4 h-4" />
                      HORAS TOTALES: {teacher.horas_totales}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="flex flex-col">
                      <span className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">RFC</span>
                      <span className="font-mono font-semibold">{teacher.rfc}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">CURP</span>
                      <span className="font-mono font-semibold">{teacher.curp}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">Clave Presupuestal</span>
                      <span className="font-mono font-semibold">{teacher.clave_presupuestal}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">Categoría</span>
                      <span className="font-semibold">{teacher.categoria}</span>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4 pt-2">
                    <div className="flex-1 flex items-start gap-2">
                      <MapPin className="text-gray-400 w-4 h-4 mt-0.5" />
                      <div>
                        <span className="text-gray-400 font-bold uppercase text-[10px] tracking-wider block">Centro de Trabajo</span>
                        <span className="font-medium">{teacher.centro_trabajo}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <FileText className="text-gray-400 w-4 h-4 mt-0.5" />
                      <div>
                        <span className="text-gray-400 font-bold uppercase text-[10px] tracking-wider block">Horas Base</span>
                        <span className="font-bold text-guinda">{teacher.horas_base} hrs</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {results.length === 0 && !loading && !message && (
              <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-500">Inicie una búsqueda para ver resultados</h3>
                <p className="text-gray-400 mt-2">Puede buscar por cualquier dato del maestro</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="no-print mt-auto py-8 text-center text-gray-400 text-sm border-t border-gray-100">
        <p>&copy; {new Date().getFullYear()} SEGEY - Educación Física</p>
      </footer>
    </div>
  );
}
