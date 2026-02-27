import streamlit as st
import cv2
import numpy as np
from insightface.app import FaceAnalysis
from PIL import Image
import tempfile

st.set_page_config(page_title="Face Match Test")

st.title("Face Recognition Confidence Test")

# Initialize InsightFace model
@st.cache_resource
def load_model():
    app = FaceAnalysis(name="buffalo_l", providers=['CPUExecutionProvider'])
    app.prepare(ctx_id=0)
    return app

app = load_model()

# Load reference image
st.subheader("Reference Image (me.jpeg)")
reference_image = Image.open("me.jpeg")
st.image(reference_image, width=300)

# Get reference embedding
def get_embedding(img):
    img = np.array(img)
    faces = app.get(img)
    if len(faces) == 0:
        return None
    return faces[0].normed_embedding

ref_embedding = get_embedding(reference_image)

if ref_embedding is None:
    st.error("No face detected in reference image!")
    st.stop()

st.success("Reference face loaded successfully.")

st.subheader("Live Camera Test")

run = st.checkbox("Start Camera")

FRAME_WINDOW = st.image([])

camera = cv2.VideoCapture(0)

while run:
    ret, frame = camera.read()
    if not ret:
        st.error("Failed to access camera")
        break

    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    FRAME_WINDOW.image(rgb_frame)

    faces = app.get(rgb_frame)

    if len(faces) > 0:
        live_embedding = faces[0].normed_embedding
        similarity = np.dot(ref_embedding, live_embedding)
        confidence = similarity * 100

        st.write(f"### Match Confidence: {confidence:.2f}%")

camera.release()