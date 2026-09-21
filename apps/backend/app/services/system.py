import os
import platform
import shutil
import subprocess

import psutil

from app.schemas.health import SystemSpecs


def get_system_specs() -> SystemSpecs:
    """Collect hardware and platform diagnostics."""
    os_name = platform.system()
    os_version = f"{platform.release()} ({platform.version()})"
    cpu_model = platform.processor() or "Unknown CPU"

    physical_cores = psutil.cpu_count(logical=False) or 1
    logical_cores = psutil.cpu_count(logical=True) or 1

    vm = psutil.virtual_memory()
    ram_total = vm.total
    ram_available = vm.available

    cwd = os.getcwd()
    disk = shutil.disk_usage(cwd)
    disk_total = disk.total
    disk_free = disk.free

    gpu_available = False
    gpu_name = None
    vram_total = None
    vram_free = None
    cuda_available = False
    cuda_version = None

    # Check for PyTorch CUDA availability if torch is installed
    try:
        import torch

        if torch.cuda.is_available():
            gpu_available = True
            cuda_available = True
            cuda_version = str(torch.version.cuda) if torch.version.cuda else None
            gpu_name = str(torch.cuda.get_device_name(0))
            mem_stats = torch.cuda.mem_get_info()
            vram_free = int(mem_stats[0])
            vram_total = int(mem_stats[1])
    except ImportError:
        pass

    # If PyTorch didn't find GPU, inspect Windows display devices
    if not gpu_available and platform.system() == "Windows":
        try:
            out = subprocess.check_output(
                ["wmic", "path", "win32_VideoController", "get", "name,adapterram"],
                text=True,
                stderr=subprocess.DEVNULL,
            )
            lines = [line.strip() for line in out.strip().split("\n") if line.strip()]
            if len(lines) > 1:
                parts = lines[1].rsplit(None, 1)
                if parts:
                    gpu_name = parts[0]
                    gpu_available = True
                    if len(parts) > 1 and parts[1].isdigit():
                        vram_total = int(parts[1])
        except (subprocess.SubprocessError, OSError):
            pass

    return SystemSpecs(
        os=os_name,
        os_version=os_version,
        cpu_model=cpu_model,
        cpu_cores_physical=physical_cores,
        cpu_cores_logical=logical_cores,
        ram_total_bytes=ram_total,
        ram_available_bytes=ram_available,
        gpu_available=gpu_available,
        gpu_name=gpu_name,
        vram_total_bytes=vram_total,
        vram_free_bytes=vram_free,
        cuda_available=cuda_available,
        cuda_version=cuda_version,
        disk_total_bytes=disk_total,
        disk_free_bytes=disk_free,
    )
