/**
 * 新手教程页 —— 6 步分页引导。
 * 依赖: view/guides/steps, common/routes
 */

const { STEPS } = require('../../guides/steps');
const { ROUTES } = require('../../../common/routes');

Page({
  data: {
    currentStep: 0,
    totalSteps:  STEPS.length,
    step:        STEPS[0],
  },

  onPrev() {
    if (this.data.currentStep <= 0) return;
    const idx = this.data.currentStep - 1;
    this.setData({ currentStep: idx, step: STEPS[idx] });
  },

  onNext() {
    const idx = this.data.currentStep + 1;
    if (idx >= STEPS.length) return;
    this.setData({ currentStep: idx, step: STEPS[idx] });
  },
});
