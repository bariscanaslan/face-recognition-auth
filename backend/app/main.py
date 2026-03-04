from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
from insightface.app import FaceAnalysis
import base64, json, os
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

face_app = FaceAnalysis(name="buffalo_l", providers=['CPUExecutionProvider'])
face_app.prepare(ctx_id=0)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ref_img = cv2.imread(os.path.join(BASE_DIR, "me2.jpg"))
ref_img = cv2.cvtColor(ref_img, cv2.COLOR_BGR2RGB)
ref_faces = face_app.get(ref_img)

if not ref_faces:
    raise RuntimeError("Reference image'da yüz bulunamadı!")

ref_embedding = ref_faces[0].normed_embedding

class FrameRequest(BaseModel):
    image: str  # base64 data URL

@app.post("/analyze")
async def analyze_frame(body: FrameRequest):
    try:
        img_data = base64.b64decode(body.image.split(",")[1])
        np_arr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if frame is None:
            raise HTTPException(status_code=400, detail="Görüntü okunamadı.")

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        faces = face_app.get(rgb_frame)

        if not faces:
            return {"status": "no_face", "faces": []}

        results = []
        for face in faces:
            x1, y1, x2, y2 = face.bbox.astype(int).tolist()
            similarity = float(np.dot(ref_embedding, face.normed_embedding))
            confidence = round(similarity * 100, 2)
            results.append({
                "bbox": [x1, y1, x2, y2],
                "confidence": confidence
            })

        return {"status": "ok", "faces": results}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))