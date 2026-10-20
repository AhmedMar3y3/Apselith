import { Camera, Cartesian3, Matrix4, Transforms } from 'cesium';

/** Move the tracking frame without overwriting the user's local camera pose. */
export class FollowCamera {
  private readonly transform = new Matrix4();
  private readonly position = new Cartesian3();
  private readonly direction = new Cartesian3();
  private readonly up = new Cartesian3();
  private readonly right = new Cartesian3();

  update(camera: Camera, target: Cartesian3) {
    Cartesian3.clone(camera.position, this.position);
    Cartesian3.clone(camera.direction, this.direction);
    Cartesian3.clone(camera.up, this.up);
    Cartesian3.clone(camera.right, this.right);
    camera.lookAtTransform(
      Transforms.eastNorthUpToFixedFrame(target, undefined, this.transform),
    );
    Cartesian3.clone(this.position, camera.position);
    Cartesian3.clone(this.direction, camera.direction);
    Cartesian3.clone(this.up, camera.up);
    Cartesian3.clone(this.right, camera.right);
  }
}
