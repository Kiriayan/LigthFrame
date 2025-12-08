import io
from typing import Tuple
from PIL import Image
import numpy as np
import cv2
import base64

MAX_COLOR_COUNT = 10_000_000

def count_colors(img_pil: Image.Image) -> int:
    img = img_pil.convert("RGB")
    colors = img.getcolors(MAX_COLOR_COUNT)
    if colors is None:
        arr = np.array(img)
        flat = arr.reshape(-1, arr.shape[2])
        dtype = np.dtype((np.void, flat.dtype.itemsize * flat.shape[1]))
        b = np.ascontiguousarray(flat).view(dtype)
        return len(np.unique(b))
    return len(colors)

def resize_for_compression(img_pil: Image.Image, max_dim: int = 1024) -> Image.Image:
    w, h = img_pil.size
    max_side = max(w, h)
    if max_side <= max_dim:
        return img_pil
    scale = max_dim / float(max_side)
    new_w = int(round(w * scale))
    new_h = int(round(h * scale))
    return img_pil.resize((new_w, new_h), Image.LANCZOS)

def compress_image_pillow(
    in_bytes: bytes,
    n_colors: int = 16,
    out_format: str = "jpeg",
    reduce_resolution: bool = True,
    jpeg_quality: int = 85,
    max_dim: int = 1024,
    dither: bool = True,
) -> Tuple[bytes, int]:
    img = Image.open(io.BytesIO(in_bytes)).convert("RGB")
    if reduce_resolution:
        img = resize_for_compression(img, max_dim=max_dim)

    dither_flag = Image.FLOYDSTEINBERG if dither else Image.NONE
    pal = img.convert("P", palette=Image.ADAPTIVE, colors=n_colors, dither=dither_flag)
    result = pal.convert("RGB")

    out_buf = io.BytesIO()
    fmt = out_format.lower()
    if fmt == "png":
        result.save(out_buf, format="PNG", optimize=True)
    else:
        result.save(out_buf, format="JPEG", quality=jpeg_quality, optimize=True)

    out_bytes = out_buf.getvalue()
    compressed_colors = count_colors(result)
    return out_bytes, compressed_colors

def enhance_image_bilateral(
    in_bytes: bytes,
    d: int = 9,
    sigma_color: int = 75,
    sigma_space: int = 75,
    upsample_scale: float = 1.0,
) -> Tuple[bytes, int]:
    pil = Image.open(io.BytesIO(in_bytes)).convert("RGB")
    if upsample_scale != 1.0:
        w, h = pil.size
        pil = pil.resize((int(w * upsample_scale), int(h * upsample_scale)), Image.LANCZOS)

    arr = np.array(pil)
    bgr = cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)
    enhanced = cv2.bilateralFilter(bgr, d, sigma_color, sigma_space)
    rgb = cv2.cvtColor(enhanced, cv2.COLOR_BGR2RGB)
    out_pil = Image.fromarray(rgb)
    out_buf = io.BytesIO()
    out_pil.save(out_buf, format="JPEG", quality=95, optimize=True)
    out_bytes = out_buf.getvalue()
    enhanced_colors = count_colors(out_pil)
    return out_bytes, enhanced_colors

def bytes_to_base64_str(b: bytes) -> str:
    return base64.b64encode(b).decode("ascii")
