// 1. Install dependencies DONE
// 2. Import dependencies DONE
// 3. Setup webcam and canvas DONE
// 4. Define references to those DONE
// 5. Load handpose DONE
// 6. Detect function DONE
// 7. Drawing utilities DONE
// 8. Draw functions DONE

import React, { useRef } from "react";
// import logo from './logo.svg';
import * as tf from "@tensorflow/tfjs";
import * as handpose from "@tensorflow-models/handpose";
import Webcam from "react-webcam";

import { drawHand } from "./U";

function Posehand({ onMovementUpdate }) {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  const runHandpose = async () => {
    const net = await handpose.load();
    console.log("Handpose model loaded.");
    //  Loop and detect hands
    setInterval(() => {
      detect(net);
    }, 100);
  };

  let previousHandPosition = null;
  let lastReturnedMovement = null;
  let consecutiveFramesInSameDirection = 0;
  
  const getHandMovement = (hand) => {
      // If no hand is detected, reset tracking
      if (!hand || hand.length === 0) {
          previousHandPosition = null;
          consecutiveFramesInSameDirection = 0;
          lastReturnedMovement = null;
          return {
              animation: 'none',
              direction: 'none'
          };
      }
  
      // Get palm position
      const currentPosition = hand[0].landmarks[0];
      
      // Initialize first position
      if (!previousHandPosition) {
          previousHandPosition = currentPosition;
          return {
              animation: 'static',
              direction: 'none'
          };
      }
  
      // Calculate movement deltas
      const deltaX = currentPosition[0] - previousHandPosition[0];
      const deltaY = currentPosition[1] - previousHandPosition[1];
      
      // Lower thresholds for more sensitivity
      const MOVEMENT_THRESHOLD = 5; // Reduced from 15
      const MIN_CONSECUTIVE_FRAMES = 2; // Reduced from 3
      
      // Calculate velocity
      const velocity = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      

  
      let direction = 'none';
      let animation = 'static';
  
      // Simplified direction detection
      if (Math.abs(deltaX) > MOVEMENT_THRESHOLD || Math.abs(deltaY) > MOVEMENT_THRESHOLD) {
          let newDirection;
          
          // Determine primary direction based on larger delta
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
              newDirection = deltaX > 0 ? 'right' : 'left';
              animation = deltaX > 0 ? 'slideRight' : 'slideLeft';
          } else {
              newDirection = deltaY > 0 ? 'down' : 'up';
              animation = deltaY > 0 ? 'slideDown' : 'slideUp';
          }
  
          // Track consecutive frames
          if (newDirection === lastReturnedMovement?.direction) {
              consecutiveFramesInSameDirection++;
          } else {
              consecutiveFramesInSameDirection = 0;
          }
  
       
  
          // Update direction if we have enough consecutive frames
          if (consecutiveFramesInSameDirection >= MIN_CONSECUTIVE_FRAMES) {
              direction = newDirection;
          }
      }
  
      // Update previous position and last movement
      previousHandPosition = currentPosition;
      if (direction !== 'none') {
          lastReturnedMovement = { animation, direction };
      }
  
      const result = {
          animation,
          direction,
          debug: {
              deltaX,
              deltaY,
              velocity,
              consecutiveFrames: consecutiveFramesInSameDirection
          }
      };
  
     
      return result;
  };
  
  // Helper functions for movement detection
 


  const detect = async (net) => {
    // Check data is available
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

      // Set canvas height and width
      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;

      // Make Detections
      const hand = await net.estimateHands(video);
      const  animation = getHandMovement(hand);
    
      if (animation.animation !== "static" && animation.animation !== "none" || animation.direction !== "none") {
        setTimeout(()=>{
            onMovementUpdate(animation);
        },1000)
       
    }
    

    
        

      // Draw mesh
      const ctx = canvasRef.current.getContext("2d");
      drawHand(hand, ctx);

      
    }
  };

  runHandpose();

  return (
    <div className="App">
      <header className="App-header">
        <Webcam
          ref={webcamRef}
          style={{
            position: "absolute",
            marginLeft: "auto",
            marginRight: "auto",
            left: 2,
            bottom:10,
            textAlign: "center",
            zindex: 9,
            width: 440,
            height: 280,
          }}
        />

        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            marginLeft: "auto",
            marginRight: "auto",
            left: 2,
            bottom:10,
            textAlign: "center",
            zindex: 9,
            width: 440,
            height: 280,
          }}
        />
      </header>
    </div>
  );
}

export default Posehand;