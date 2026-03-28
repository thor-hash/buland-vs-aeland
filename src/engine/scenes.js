class SceneManager {
  constructor(root) {
    this.root = root;
    this.scenes = new Map();
    this.current = null;
  }

  register(name, scene) {
    this.scenes.set(name, scene);
  }

  async go(name, data) {
    if (this.current) {
      const oldScene = this.scenes.get(this.current);
      if (oldScene?.el) oldScene.el.classList.remove('active');
      if (oldScene?.onExit) oldScene.onExit();
    }

    this.current = name;
    const scene = this.scenes.get(name);
    if (!scene) throw new Error(`Scene "${name}" not found`);

    if (!scene.el) {
      scene.el = scene.create(this.root);
      scene.el.classList.add('scene');
      this.root.appendChild(scene.el);
    }

    if (scene.onEnter) await scene.onEnter(data);

    // Force reflow then activate
    scene.el.offsetHeight;
    scene.el.classList.add('active');
  }
}

export const sceneManager = new SceneManager(null);

export function initScenes(root) {
  sceneManager.root = root;
}
