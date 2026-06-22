/**
 * 滚动动画检测 Composable可组合的可拼装的，用于检测元素是否进入视口并触发动画
 * 使用 Intersection Observer API 检测元素是否进入视口
 */
import { ref, onMounted, onUnmounted } from 'vue'

/**
 * 创建滚动动画状态
 * @param {object} options - 配置选项
 * @param {string} options.rootMargin - 观察器根元素边距，默认 '0px'
 * @param {number} options.threshold - 交叉比例阈值，默认 0.1
 * @returns {object} 动画状态和方法
 */
export function useScrollAnimation(options = {}) {
  const { rootMargin = '-80px', threshold = 0.2 } = options
//const{rootMargin,threshold} = options
// 解构赋值，将options对象中的rootMargin和threshold属性值赋值给rootMargin和threshold变量
  const isVisible = ref(false)// 元素是否进入视口，const创建必须要初始化，之后不能更改
  const hasAnimated = ref(false)// 元素是否已触发动画
  let observer = null

  const observe = (el) => {
    //1.边界检查：如果没有传入元素或者元素已经触发动画，直接返回
    if (!el || hasAnimated.value) return
    //2.创建观察者实例IntersectionObserver，并设置回调函数和配置项
    observer = new IntersectionObserver(
      (entries) => {//这是一个箭头回调函数，entry（条目，项）entries很多项是这个函数的参数，是传进来的数据，是一个对象数组，包含元素的交叉状态信息，IntersectionObserver可以同时观察多个元素，所以回调函数收到的是一个数组entries。数组的每个元素都是一个对象，包含了被观察的元素。
        entries.forEach((entry) => {
          if (entry.isIntersecting) {//3.如果元素进入视口
            isVisible.value = true// 元素进入视口，设置为true,标记为可见
            hasAnimated.value = true// 元素已经触发动画，设置为true,标记为已动画
           
            if (observer && entry.target) {
               // 动画触发后停止观察元素，告诉观测器，不要再观察这个元素了，避免重复触发，节约性能
              observer.unobserve(entry.target)
            }
          }
        })
      },
      { rootMargin, threshold }
      // 配置项：rootMargin（根元素边距），threshold（交叉比例阈值）,默认值rootMargin=-80px,threshold=0.2
    )

    observer.observe(el)//4.告诉监视器，开始观察元素el，当元素进入视口时，触发回调函数
  }

  const disconnect = () => {
    if (observer) {
      observer.disconnect()
      observer = null
    }
  }

  onUnmounted(() => {
    disconnect()
  })

  return {
    isVisible,
    hasAnimated,
    observe,
    disconnect
  }
}

/**
 * 批量元素滚动动画
 */
export function useBatchScrollAnimation(count = 1, options = {}) {
  const { rootMargin = '-80px', threshold = 0.15, staggerDelay = 150 } = options

  const visibleItems = ref(new Array(count).fill(false).map(() => ({ isVisible: false, hasAnimated: false })))
  let observers = []

  const observeItem = (el, index) => {
    if (!el || visibleItems.value[index]?.hasAnimated) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              visibleItems.value[index] = { isVisible: true, hasAnimated: true }
            }, index * staggerDelay)
            observer.unobserve(entry.target)
          }
        })
      },
      { rootMargin, threshold }
    )

    observers.push(observer)
    observer.observe(el)
  }

  const disconnectAll = () => {
    observers.forEach((obs) => obs.disconnect())
    observers = []
  }

  onUnmounted(() => {
    disconnectAll()
  })

  return {
    visibleItems,
    observeItem,
    disconnectAll
  }
}

/**
 * 鼠标移动跟踪
 */
export function useMouseFollow() {
  const mouseX = ref(0)
  const mouseY = ref(0)
  const isInViewport = ref(false)

  const handleMouseMove = (e) => {
    mouseX.value = e.clientX
    mouseY.value = e.clientY
    isInViewport.value = true
  }

  const handleMouseLeave = () => {
    isInViewport.value = false
  }

  onMounted(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseleave', handleMouseLeave)
  })

  onUnmounted(() => {
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseleave', handleMouseLeave)
  })

  return {
    mouseX,
    mouseY,
    isInViewport
  }
}
