import React, { useRef, useState, useEffect } from "react";
import * as tf from "@tensorflow/tfjs";
import * as posenet from "@tensorflow-models/posenet";
import Webcam from "react-webcam";
import { drawKeypoints, drawSkeleton } from "./utilities";

function TfWebcam() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [previousPose, setPreviousPose] = useState(null);
  const [movementDetected, setMovementDetected] = useState(false);

  // Load posenet
  const runPosenet = async () => {
    const net = await posenet.load({
      inputResolution: { width: 640, height: 480 },
      scale: 0.8,
    });
    setInterval(() => {
      detect(net);
    }, 100);
  };

  const detect = async (net) => {
    if (
      typeof webcamRef.current !== "undefined" &&
      webcamRef.current !== null &&
      webcamRef.current.video.readyState === 4
    ) {
      // Get Video Properties
      const video = webcamRef.current.video;
      const videoWidth = webcamRef.current.video.videoWidth;
      const videoHeight = webcamRef.current.video.videoHeight;

      // Set video width
      webcamRef.current.video.width = videoWidth;
      webcamRef.current.video.height = videoHeight;

      // Make Detections
      const pose = await net.estimateSinglePose(video);
      console.log(pose);

      // Detect movement
      if (previousPose) {
        const isMovement = detectThumbMovement(previousPose, pose);
        if (isMovement && !movementDetected) {
          setMovementDetected(true);
          alert("Thumb movement detected!"); // Trigger alert
        } else if (!isMovement) {
          setMovementDetected(false);
        }
      }

      // Update previous pose
      setPreviousPose(pose);

      // Draw pose on canvas
      drawCanvas(pose, video, videoWidth, videoHeight, canvasRef);
    }
  };

  const detectThumbMovement = (previousPose, currentPose, threshold = 20) => {
    if (!previousPose || !currentPose) return false;

    // Keypoints for thumbs
    const leftThumbIndex = 9;
    const rightThumbIndex = 10;

    const prevLeftThumb = previousPose.keypoints[leftThumbIndex];
    const currLeftThumb = currentPose.keypoints[leftThumbIndex];
    const prevRightThumb = previousPose.keypoints[rightThumbIndex];
    const currRightThumb = currentPose.keypoints[rightThumbIndex];

    let totalMovement = 0;

    // Check left thumb movement
    if (prevLeftThumb.score > 0.5 && currLeftThumb.score > 0.5) {
      const dx = currLeftThumb.x - prevLeftThumb.x;
      const dy = currLeftThumb.y - prevLeftThumb.y;
      totalMovement += Math.sqrt(dx * dx + dy * dy);
    }

    // Check right thumb movement
    if (prevRightThumb.score > 0.5 && currRightThumb.score > 0.5) {
      const dx = currRightThumb.x - prevRightThumb.x;
      const dy = currRightThumb.y - prevRightThumb.y;
      totalMovement += Math.sqrt(dx * dx + dy * dy);
    }

    // Return true if movement exceeds the threshold
    return totalMovement > threshold;
  };

  const drawCanvas = (pose, video, videoWidth, videoHeight, canvas) => {
    const ctx = canvas.current.getContext("2d");
    canvas.current.width = videoWidth;
    canvas.current.height = videoHeight;

    drawKeypoints(pose["keypoints"], 0.6, ctx);
    drawSkeleton(pose["keypoints"], 0.7, ctx);
  };

  useEffect(() => {
    runPosenet();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <Webcam
          ref={webcamRef}
          style={{
            position: "absolute",
            marginLeft: "auto",
            marginRight: "auto",
            left: 0,
            bottom: 0,
            textAlign: "center",
            zindex: 9,
            width: 200,
            height: 300,
          }}
        />

        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            marginLeft: "auto",
            marginRight: "auto",
            left: 0,
            bottom: 0,
            textAlign: "center",
            zindex: 9,
            width: 200,
            height: 300,
          }}
        />
      </header>
    </div>
  );
}

export default TfWebcam;