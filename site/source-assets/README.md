# Reproducible motion sample geometry

`human-base.glb` contains the CC0 MakeHuman mesh and skeleton extracted from OpenGym3D's CC0 push-up asset. All original animation clips and muscle vertex colors were removed. The three motion samples are regenerated locally by `../scripts/build-motion-samples.py` with Python and NumPy.

See `../dist/motion-lab/assets/provenance.json` for source URLs and SHA-256 hashes. Third-party notices are preserved in `../dist/motion-lab/vendor/`.

The generator uses kinematic approximations. Its bone-length and loop checks are engineering checks; the samples have not received professional movement review.
