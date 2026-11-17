"""
Satellite Infrastructure Change Ledger - Processing CLI.
Provides command-line utilities for pipeline execution, raster inspection, and testing.
"""

from __future__ import annotations
import argparse
import json
import sys

from .raster.geotiff import RasterIO
from .workers.pipeline import ProcessingPipeline


def main():
    parser = argparse.ArgumentParser(description="Satellite Infrastructure Processing CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # inspect
    p_inspect = subparsers.add_parser("inspect", help="Inspect a raster's geospatial metadata")
    p_inspect.add_argument("path", help="Path to raster GeoTIFF")

    # detect
    p_detect = subparsers.add_parser("detect", help="Run change detection on a temporal raster pair")
    p_detect.add_argument("--t1", required=True, help="Baseline observation GeoTIFF")
    p_detect.add_argument("--t2", required=True, help="Current observation GeoTIFF")
    p_detect.add_argument("--area-id", default="area-apex-park-01", help="Monitoring Area ID")
    p_detect.add_argument("--t1-date", default="2016-08-15")
    p_detect.add_argument("--t2-date", default="2021-07-10")
    p_detect.add_argument("--out", default=None, help="Output JSON results path")

    args = parser.parse_args()

    if args.command == "inspect":
        _, meta = RasterIO.read(args.path)
        print(json.dumps(meta.to_dict(), indent=2))

    elif args.command == "detect":
        pipeline = ProcessingPipeline()
        res = pipeline.run_detection_pipeline(
            t1_raster_path=args.t1,
            t2_raster_path=args.t2,
            area_id=args.area_id,
            t1_date=args.t1_date,
            t2_date=args.t2_date
        )
        output_str = json.dumps(res, indent=2)
        if args.out:
            with open(args.out, "w") as f:
                f.write(output_str)
            print(f"Results written to {args.out}")
        else:
            print(output_str)


if __name__ == "__main__":
    main()
