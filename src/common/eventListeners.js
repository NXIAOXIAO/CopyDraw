const eventListeners = []

function addEventListenerWithTracking(element, event, listener, ...args) {
  element.addEventListener(event, listener, ...args)
  eventListeners.push({ element, event, listener })
}

function removeAllEventListeners() {
  eventListeners.forEach(({ element, event, listener }) => {
    element.removeEventListener(event, listener)
  })
  eventListeners.length = 0
}

export { addEventListenerWithTracking, removeAllEventListeners }
