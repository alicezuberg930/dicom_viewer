# DICOM test fixtures

This directory contains 20 public test DICOM files with distinct values of
`NumberOfFrames (0028,0008)`. They are intended for viewer development and
interoperability testing only, not diagnosis.

Verified frame counts:

`1, 2, 3, 4, 7, 8, 10, 13, 15, 19, 20, 25, 30, 62, 79, 96, 120, 140, 299, 1250`

`manifest.csv` records the verified frame count, modality, byte size, SHA-256,
immutable source URL, repository commit, and license for every file. Original
license texts are retained in `licenses/`.

The fixtures come from the public pydicom, highdicom, dcmjs, and fo-dicom test
repositories. Some legacy fixtures intentionally contain synthetic or
demonstration demographics in their DICOM headers. Do not treat this directory
as a source of clinically de-identified research data.
