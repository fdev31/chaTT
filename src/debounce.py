import time
import heapq
import threading

class Debouncer(threading.Thread):
    """ Allows to debounce calls happening within a delay
Eg: if
- you schedule a function *A* with a delay of `0.3s`
- `0.2s` after you re-schedule the same *A* with the same delay
- *A* will be only called once, after `0.5s`

    """
    def __init__(self, *a, **k):
        threading.Thread.__init__(self, *a, **k)
        self.tasks = {}
        self.min_delay = 0.5
        self.task_list = []

    def schedule(self, callback, delay):
        """ Schedules `callback` for execution when `delay` is elapsed

        :callback: (fn) any callable
        :delay: (float) the delay in seconds, can be a fraction
        """
        assert delay > 0.005, "this is probably useless with such small values"
        abs_time = time.time() + delay
        if delay < self.min_delay:
            self.min_delay = delay
        if callback in self.tasks:
            self.tasks[callback][0] = abs_time
            heapq.heapify(self.task_list)
        else:
            tup = [abs_time, callback]
            self.tasks[callback] = tup
            heapq.heappush(self.task_list, tup)

    def run(self):
        self.running = True
        while self.running:
            now = time.time()
            if self.task_list:
                if self.task_list[0][0] <= now:
                    d = 0
                    t = heapq.heappop(self.task_list)
                    del self.tasks[t[1]]
                    try:
                        t[1]()
                    except Exception as e:
                        print(e)
                else:
                    d = self.task_list[0][0] - now
            else:
                d = self.min_delay

            time.sleep(d)

if __name__ == '__main__':
    t = Debouncer()
#     t.setDaemon(True)
    t.start()

    l = lambda: print("Test")

    for n in range(10):
        t.schedule(lambda: print("Autre test"), 0.21)
        t.schedule(l, 0.2)
        time.sleep(0.01)
        t.schedule(l, 0.2)
        time.sleep(0.1)
        t.schedule(l, 0.2)
        time.sleep(0.15)
        t.schedule(l, 0.2)
        time.sleep(1)
        print("~~~")
    t.running = False
