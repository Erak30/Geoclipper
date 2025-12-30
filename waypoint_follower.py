#!/usr/bin/env python3
import argparse
import logging
import os
from typing import Optional

import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Pose

from .simple_spot_commander import SimpleSpotCommander


class SpotWaypointFollower(Node):
    def __init__(self, robot_name: Optional[str] = None):
        super().__init__('spot_waypoint_follower')
        self._logger = logging.getLogger('SpotWaypointFollower')

        # Initialize Spot Commander
        self.robot = SimpleSpotCommander(robot_name=robot_name, node=self)
        # Waypoints list [(start, goal)]
        self.pose_pairs = []
        self.current_index = 0

        # Load waypoints from coords.txt
        coords_file = os.path.join(os.path.dirname(__file__), 'coords.txt')
        self.load_waypoints(coords_file)
     

        # log the loaded waypoints
        self.timer = self.create_timer(0.5, self.control_loop)
        self._logger.info(f"Loaded {len(self.pose_pairs)} waypoints. Starting...")

    def load_waypoints(self, file_path: str):
        with open(file_path, 'r') as f:
            for line in f:
                line = line.strip().rstrip(',')
                if not line:
                    continue
                start, goal = eval(line)
                self.pose_pairs.append((start, goal))

    def control_loop(self):
        if self.current_index >= len(self.pose_pairs):
            self._logger.info("All waypoints completed.")
            self.timer.cancel()
            return

        start, goal = self.pose_pairs[self.current_index]

        # Create a Pose message 
        goal_pose = Pose()
        goal_pose.position.x = goal[0]
        goal_pose.position.y = goal[1]
        goal_pose.position.z = 0.0
        goal_pose.orientation.w = 1.0

        self._logger.info(f"Navigating to waypoint {self.current_index}: {goal}")

        # Stand up before moving
        result = self.robot.command("stand")
        if not result.success:
            self._logger.error(f"Failed to stand: {result.message}")
            return

        # Walk to goal,only tells the robot to walk forward, using walk forward from the simple_spot_commander not reliable traversal
        walk_result = self.robot.command("walk_forward")
        if walk_result.success:
            self._logger.info(f"Reached waypoint {self.current_index}: {goal}")
            self.current_index += 1
        else:
            self._logger.error(f"Failed to walk: {walk_result.message}")


def cli() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser()
    parser.add_argument("robot", help="Name of the robot (namespace)")
    return parser

def main(args=None):
    rclpy.init(args=args)
    import sys
    if len(sys.argv) < 2:
        print("Usage: ros2 run spot_examples waypoint_follower <robot_name>")
        return
    robot_name = sys.argv[1]
    node = SpotWaypointFollower(robot_name)
    rclpy.spin(node)
    rclpy.shutdown()

if __name__ == "__main__":
    main()
