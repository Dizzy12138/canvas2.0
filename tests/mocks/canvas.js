export const createCanvas = () => ({
  getContext: () => ({})
});

export const loadImage = async () => ({ width: 0, height: 0 });

export const registerFont = () => {};

export default {
  createCanvas,
  loadImage,
  registerFont
};
