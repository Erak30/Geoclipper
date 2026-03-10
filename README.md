Explanation

The Geoclipper tool acts as a "cookie cutter" for robotic maps inside of Nav2. It crops a large GeoJSON environment down to a specific bounding box, the bounding box boundaries are specified by the user. After clipping the map it generates a route in the form of coordinates. After which a simulation of the robot going through the newly established path can be ran.
Tool Installation Setup
Phase 1: Install Ubuntu 24.04 LTS (Windows PowerShell)

    Open PowerShell as Administrator.
    Install Ubuntu 24.04 with the following command:

 wsl --install -d Ubuntu-24.04

    Restart your PC if prompted. Once Ubuntu opens, create your username and password.

Phase 2. Install ROS 2 Humble

Since Humble targets Ubuntu 22.04, we follow the official Debian installation . The following installations of ROS2 and Nav2 should take place inside of Ubuntu.

    Move to home directory:

cd home/<you username>

    Set Locale:

locale  # check for UTF-8

sudo apt update && sudo apt install locales
sudo locale-gen en_US en_US.UTF-8
sudo update-locale LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8
export LANG=en_US.UTF-8

locale  # verify settings

    Add ROS 2 Repositories:

sudo apt install software-properties-common
sudo add-apt-repository universe

sudo apt update && sudo apt install curl -y
export ROS_APT_SOURCE_VERSION=$(curl -s https://api.github.com/repos/ros-infrastructure/ros-apt-source/releases/latest | grep -F "tag_name" | awk -F\" '{print $4}')
curl -L -o /tmp/ros2-apt-source.deb "https://github.com/ros-infrastructure/ros-apt-source/releases/download/${ROS_APT_SOURCE_VERSION}/ros2-apt-source_${ROS_APT_SOURCE_VERSION}.$(. /etc/os-release && echo ${UBUNTU_CODENAME:-${VERSION_CODENAME}})_all.deb"
sudo dpkg -i /tmp/ros2-apt-source.deb

    Install ROS2 Packages:

sudo apt update
sudo apt upgrade
sudo apt install ros-humble-desktop
sudo apt install ros-dev-tools

    Auto-Source Environment: If you would like to automatically source your environment instead of doing it manually every time you can run:

echo "source /opt/ros/humble/setup.bash" >> ~/.bashrc
source ~/.bashrc

Phase 3: Set Geoclipper folder up and add files

    Create workspace folder

mkdir geoclipper

    Add files

curl -O https://raw.githubusercontent.com/Erak30/Geoclipper/main/footer.txt \
     -O https://raw.githubusercontent.com/Erak30/Geoclipper/main/header.txt \
     -O https://raw.githubusercontent.com/Erak30/Geoclipper/main/main.js

Note - If you get a "curl command not found" error, you can install it first using:

sudo apt install curl -y

Phase 4: Set Up nav2_ws workspace and install Nav2

Firstly we will create a workspace directory named "nav2_ws", after which we will follow the official Nav2 Installation Guide to ensure everything will be installed as intended. We will be building the workspace later on.

    Create workspace folder inside of home directory

mkdir -p nav2_ws/src
cd nav2_ws

    Install Nav2 Binaries:

sudo apt update
sudo apt install ros-humble-navigation2
sudo apt install ros-humble-nav2-bringup

    Build Workspace:

source /opt/ros/humble/setup.bash
colcon build --symlink-install

Phase 5: Set Up the correct controller

The default controller the NAV2 simulation uses is the MPPI Controller which takes large turns between nodes. For the purposes of gas leak detection we need the robot to stay on the paths between nodes as much as possible and not diverge. This is why we need to change the controller to the DWB controller which does just that.

    Go to correct folder

cd nav2_ws/src/navigation2/nav2_bringup/params

    Replace existing params file with the one from our GitHub repo

wget -O nav2_params.yaml https://raw.githubusercontent.com/Erak30/Geoclipper/main/nav2_params.yaml

Tool Usage
Phase 1: Set up file paths in main.js (optional)

    Open the main.js file:

cd geoclipper
sudo echo main.js

Inside of the main.js file the user is able to change:

    The original file map information that the script reads from. This can be changed to the users personal input file via the const dataPath variable.
    The output map data, where the clipped and processed version of the map is saved under the current line fs.writeFileSync("/home/erak/nav2_ws/install/nav2_bringup/share/nav2_bringup/graphs/output.geojson", ...);
    The mission script generation: This line overwrites the Python source code in example_route.py with your new coordinates and templates. fs.writeFileSync("/home/erak/nav2_ws/src/navigation2/nav2_simple_commander/nav2_simple_commander/example_route.py", output);

Note - The current setup is fully functional and reading from nav2_bringup/graphs/input.geojson and outputs it to the nav2_bringup/graphs/output.geojson and can be used for testing the tool. If the user was to change the file path of the mission script generation they would also need to change the command line that runs the final simulation accordingly (command line is mentioned below).
Phase 2: Source Inside Workspace

    Open the workspace folder:

cd nav2_ws

    Source using the following command:

source /opt/ros/humble/setup.bash
source ./install/setup.bash 
source /usr/share/gazebo-11/setup.bash 
export LIBGL_ALWAYS_SOFTWARE=1

ros2 launch nav2_simple_commander route_example_launch.py

Phase 3: Use Geoclipper Tool

    Go out of nav2_ws and open the geoclipper folder:

cd ../geoclipper

    Run the following command to clip the GeoJson: x1 - x coordinate of first dot y1 - y coordinate of first dot x2 - x coordinate of second dot y2 - y coordinate of second dot

After assigning the coordinates a box will be created and the new map will be exported into the Nav2 simulation which we will run next.

node main.js <x1> <y2> <x2> <y2>

Phase 4: Run Simulation

ros2 launch nav2_simple_commander route_example_launch.py

Or if mission script generation file path was changed in main.js:

ros2 launch nav2_simple_commander <your_new_launch_file>.py
