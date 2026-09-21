import edge_tts
import inspect

sig = inspect.signature(edge_tts.Communicate.__init__)
print("Communicate parameters:", list(sig.parameters.keys()))
