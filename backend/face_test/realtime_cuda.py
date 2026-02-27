import cv2
import numpy as np
from insightface.app import FaceAnalysis
import os
import time
import onnxruntime as ort

# -----------------------------
# Load InsightFace with CUDA
# -----------------------------
app = FaceAnalysis(
    name="buffalo_l",
    providers=['CUDAExecutionProvider', 'CPUExecutionProvider']
)

app.prepare(ctx_id=0, det_size=(320, 320))

print("Available providers:", ort.get_available_providers())

# -----------------------------
# Load Reference Image
# -----------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
image_path = os.path.join(BASE_DIR, "yigit.jpeg")

ref_img = cv2.imread(image_path)
ref_rgb = cv2.cvtColor(ref_img, cv2.COLOR_BGR2RGB)

faces = app.get(ref_rgb)

if len(faces) == 0:
    print("No face detected in reference image!")
    exit()

ref_embedding = faces[0].normed_embedding
print("Reference loaded.")

# -----------------------------
# Camera Setup
# -----------------------------
cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

frame_count = 0
last_faces = []
confidence_history = []

prev_time = time.time()

print("Press ESC to exit.")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame = cv2.resize(frame, (640, 480))
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    frame_count += 1

    # Detection every 5 frames
    if frame_count % 5 == 0:
        last_faces = app.get(rgb)

    for face in last_faces:
        x1, y1, x2, y2 = face.bbox.astype(int)

        # Embedding every 3 frames
        if frame_count % 3 == 0:
            live_embedding = face.normed_embedding
            similarity = np.dot(ref_embedding, live_embedding)
            confidence = similarity * 100

            confidence_history.append(confidence)
            if len(confidence_history) > 5:
                confidence_history.pop(0)

        smooth_conf = (
            sum(confidence_history) / len(confidence_history)
            if confidence_history else 0
        )

        if smooth_conf > 75:
            color = (0, 255, 0)
        elif smooth_conf > 60:
            color = (0, 255, 255)
        else:
            color = (0, 0, 255)

        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

        cv2.putText(
            frame,
            f"Match: {smooth_conf:.2f}%",
            (x1, y1 - 10),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            color,
            2
        )

    # FPS counter
    current_time = time.time()
    fps = 1 / (current_time - prev_time)
    prev_time = current_time

    cv2.putText(
        frame,
        f"FPS: {int(fps)}",
        (10, 30),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (255, 255, 255),
        2
    )

    cv2.imshow("Face Match CUDA", frame)

    if cv2.waitKey(1) & 0xFF == 27:
        break

cap.release()
cv2.destroyAllWindows()