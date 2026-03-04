import cv2
import numpy as np
from insightface.app import FaceAnalysis
import os

# -----------------------------
# Load Model
# -----------------------------
app = FaceAnalysis(name="buffalo_l", providers=['CPUExecutionProvider'])
app.prepare(ctx_id=0)

# -----------------------------
# Load Reference
# -----------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
image_path = os.path.join(BASE_DIR, "me2.jpg")

reference_image = cv2.imread(image_path)
reference_image = cv2.cvtColor(reference_image, cv2.COLOR_BGR2RGB)

faces = app.get(reference_image)

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
confidence_history = []
last_faces = []

print("Press ESC to exit.")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame = cv2.resize(frame, (640, 480))
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    frame_count += 1

    # Run model every 3 frames
    if frame_count % 3 == 0:
        faces = app.get(rgb_frame)
        last_faces = faces

    for face in last_faces:
        x1, y1, x2, y2 = face.bbox.astype(int)

        live_embedding = face.normed_embedding
        similarity = np.dot(ref_embedding, live_embedding)
        confidence = similarity * 100

        # Smooth confidence
        confidence_history.append(confidence)
        if len(confidence_history) > 5:
            confidence_history.pop(0)

        smooth_conf = sum(confidence_history) / len(confidence_history)

        if smooth_conf > 75:
            color = (0, 255, 0)
        elif smooth_conf > 60:
            color = (0, 255, 255)
        else:
            color = (0, 0, 255)

        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

        text = f"Match: {smooth_conf:.2f}%"
        cv2.putText(
            frame,
            text,
            (x1, y1 - 10),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            color,
            2
        )

    cv2.imshow("Face Match Realtime (Optimized)", frame)

    if cv2.waitKey(1) & 0xFF == 27:
        break

cap.release()
cv2.destroyAllWindows()