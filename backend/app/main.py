import io
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .image_utils import (
    compress_image_pillow,
    enhance_image_bilateral,
    count_colors,
    bytes_to_base64_str,
)
from PIL import Image

app = FastAPI(title="LightFrame - Image compressor & enhancer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "LightFrame backend running"}

@app.post("/compress")
async def compress_endpoint(
    file: UploadFile = File(...),
    no_colors: int = Form(16),
    out_format: str = Form("auto"),
    reduce_resolution: bool = Form(True),
    jpeg_quality: int = Form(85),
):
    try:
        content = await file.read()
        original_size = len(content)
        pil = Image.open(io.BytesIO(content)).convert("RGB")
        orig_colors = count_colors(pil)

        out_bytes, compressed_colors = compress_image_pillow(
            content,
            n_colors=max(1, int(no_colors)),
            out_format=out_format if out_format else "auto",
            reduce_resolution=bool(reduce_resolution),
            jpeg_quality=int(jpeg_quality),
        )
        compressed_size = len(out_bytes)
        data = {
            "image": bytes_to_base64_str(out_bytes),
            "original_size": original_size,
            "compressed_size": compressed_size,
            "original_colors": orig_colors,
            "compressed_colors": compressed_colors,
            "mime": "image/jpeg" if (out_format == "jpeg" or out_format == "auto") else "image/png",
        }
        return JSONResponse(content=data)
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.post("/enhance")
async def enhance_endpoint(
    file: UploadFile = File(...),
    d: int = Form(9),
    sigma_color: int = Form(75),
    sigma_space: int = Form(75),
    upsample: float = Form(1.0),
):
    try:
        content = await file.read()
        original_size = len(content)
        pil = Image.open(io.BytesIO(content)).convert("RGB")
        orig_colors = count_colors(pil)

        out_bytes, enhanced_colors = enhance_image_bilateral(
            content,
            d=int(d),
            sigma_color=int(sigma_color),
            sigma_space=int(sigma_space),
            upsample_scale=float(upsample),
        )
        enhanced_size = len(out_bytes)
        data = {
            "image": bytes_to_base64_str(out_bytes),
            "original_size": original_size,
            "result_size": enhanced_size,
            "original_colors": orig_colors,
            "result_colors": enhanced_colors,
            "mime": "image/jpeg",
        }
        return JSONResponse(content=data)
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)
