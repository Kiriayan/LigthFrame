import "../style.css";
import { useState } from "react";


export default function Compressor() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const [resultUrl, setResultUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const [noColors, setNoColors] = useState(16);
  const [format, setFormat] = useState("auto");
  const [reduceResolution, setReduceResolution] = useState(true);
  const [JPGQuality, setJPGQuality] = useState(85);

  const [originalSize, setOriginalSize] = useState(null);
  const [resultSize, setResultSize] = useState(null);
  const [originalColors, setOriginalColors] = useState(null);
  const [resultColors, setResultColors] = useState(null);

  const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const handleSelect = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setOriginalSize(f.size);
    setResultUrl(null);
    setResultSize(null);
    setOriginalColors(null);
    setResultColors(null);
  };

  const handleCompress = async () => {
    if (!file) { alert("Selecciona una imagen primero"); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("no_colors", noColors);
      fd.append("out_format", format);
      fd.append("reduce_resolution", reduceResolution ? "true" : "false");
      fd.append("JPG_quality", JPGQuality);

      const res = await fetch(`${API}/compress`, { method: "POST", body: fd });
      if (!res.ok) { const err = await res.json(); alert(err.error || "Error al comprimir"); setLoading(false); return; }
      const data = await res.json();
      const bin = atob(data.image);
      const len = bin.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
      const mime = data.mime || "image/JPG";
      const blob = new Blob([bytes.buffer], { type: mime });
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setResultSize(data.compressed_size || blob.size);
      setOriginalSize(data.original_size || originalSize);
      setOriginalColors(data.original_colors || null);
      setResultColors(data.compressed_colors || null);
    } catch (err) {
      console.error(err);
      alert("Error de conexión");
    } finally { setLoading(false); }
  };

  const handleEnhance = async () => {
    if (!file) { alert("Selecciona una imagen primero"); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API}/enhance`, { method: "POST", body: fd });
      if (!res.ok) { const err = await res.json(); alert(err.error || "Error al mejorar imagen"); setLoading(false); return; }
      const data = await res.json();
      const bin = atob(data.image);
      const len = bin.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes.buffer], { type: data.mime || "image/JPG" });
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setResultSize(data.result_size || blob.size);
      setOriginalSize(data.original_size || originalSize);
      setOriginalColors(data.original_colors || null);
      setResultColors(data.result_colors || null);
    } catch (err) {
      console.error(err);
      alert("Error de conexión");
    } finally { setLoading(false); }
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = "LightFrame_result.jpg";
    a.click();
  };

  return (
  <div className="compressor">
    

      {/* ===================== HEADER ===================== */}
      <header><h1>LightFrame</h1></header>


      {/* ===================== DESCRIPCIÓN ===================== */}
      <div className="description-box">
        <h2>¿Qué es LightFrame?</h2>
        <p>
          LightFrame es una herramienta que permite comprimir imágenes reduciendo paleta de colores,
          peso y resolución usando métodos optimizados. 
          Asimismo, permite mejorar la calidad de las imágenes aplicando diversos filtros que realzan los detalles y
          mejoran la nitidez de la imagen original.
        </p>
        <p>
          Para usarlo, selecciona una imagen y ajusta las opciones para comprimirla o mejorarla. Posteriormente podrás 
          descargar el archivo resultante en el formato deseado.
        </p>
      </div>

      {/* ===================== CONTROLES ===================== */}
      <div className="controls">

        {/* Botón seleccionar imagen */}
        <label className="file-input">
          Seleccionar imagen
          <input type="file" accept="image/*" onChange={handleSelect} />
        </label>

        <label className="label-inline">
          <span>Número de colores:</span>
          <input
            type="number"
            min="1"
            max="256"
            value={noColors}
            onChange={(e)=>setNoColors(Number(e.target.value))}
          />
        </label>

        <label>
          Formato:
          <select value={format} onChange={(e)=>setFormat(e.target.value)}>
            <option value="auto">Auto</option>
            <option value="JPG">JPG</option>
            <option value="png">PNG</option>
          </select>
        </label>

        <label>
          <input
            type="checkbox"
            checked={reduceResolution}
            onChange={(e)=>setReduceResolution(e.target.checked)}
          />
          Reducir resolución
        </label>

        <label style={{ opacity: format === "JPG" ? 1 : 0.4 }}>
          Calidad JPG:
          <input
            type="number"
            min="30"
            max="95"
            disabled={format !== "JPG"}
            value={JPGQuality}
            onChange={(e)=>setJPGQuality(Number(e.target.value))}
          />
        </label>

        <button onClick={handleCompress} disabled={loading||!file} className="btn btn-compress">
          {loading ? "Procesando..." : "Comprimir imagen"}
        </button>

        <button onClick={handleEnhance} disabled={loading||!file} className="btn btn-enhance">
          {loading ? "Procesando..." : "Mejorar imagen"}
        </button>

        <button onClick={handleDownload} disabled={!resultUrl} className="btn btn-download">
          Descargar
        </button>
      </div>

      {/* ===================== VISTA DE IMÁGENES ===================== */}
      <div className="images-row">

        <div className="img-card">
          <h3>Imagen original</h3>
          <div className="img-box">
            {preview ? (
              <img src={preview} alt="original" />
            ) : (
              <div className="placeholder">Selecciona una imagen</div>
            )}
          </div>

          {originalSize!=null && (
            <p className="info">Tamaño: {originalSize.toLocaleString()} bytes</p>
          )}
          {originalColors!=null && (
            <p className="info">Colores detectados: {originalColors}</p>
          )}
        </div>

        <div className="img-card">
          <h3>Resultado</h3>
          <div className="img-box">
            {resultUrl ? (
              <img src={resultUrl} alt="result" />
            ) : (
              <div className="placeholder">Aquí aparecerá el resultado</div>
            )}
          </div>

          {resultSize!=null && (
            <p className="info">Tamaño: {resultSize.toLocaleString()} bytes</p>
          )}
          {resultColors!=null && (
            <p className="info">Colores detectados: {resultColors}</p>
          )}
        </div>

      </div>

  </div>
);

}
