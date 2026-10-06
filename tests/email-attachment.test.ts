import assert from "node:assert/strict";
import test from "node:test";

import { emailAttachmentPreview, gmailAttachmentReference, safeAttachmentFilename } from "../src/lib/email-attachment";

test("allows only inert image formats, PDF and plain text previews", () => {
  assert.equal(emailAttachmentPreview("image/jpeg"), "image");
  assert.equal(emailAttachmentPreview("image/png"), "image");
  assert.equal(emailAttachmentPreview("application/pdf"), "pdf");
  assert.equal(emailAttachmentPreview("text/plain; charset=utf-8"), "text");
});

test("keeps active and unsupported formats download-only", () => {
  assert.equal(emailAttachmentPreview("image/svg+xml"), "none");
  assert.equal(emailAttachmentPreview("text/html"), "none");
  assert.equal(emailAttachmentPreview("application/vnd.openxmlformats-officedocument.wordprocessingml.document"), "none");
});

test("keeps large plain-text attachments download-only", () => {
  assert.equal(emailAttachmentPreview("text/plain", 512 * 1024), "text");
  assert.equal(emailAttachmentPreview("text/plain", 512 * 1024 + 1), "none");
});

test("removes header control characters from attachment filenames", () => {
  assert.equal(safeAttachmentFilename("invoice\r\n.pdf"), "invoice  .pdf");
  assert.equal(safeAttachmentFilename(""), "attachment");
});

test("uses the short Gmail message part reference instead of a long attachment id", () => {
  const longAttachmentId = "A".repeat(2_000);
  assert.equal(gmailAttachmentReference("1.2", longAttachmentId), "part:1.2");
  assert.equal(gmailAttachmentReference(undefined, "legacy-id"), "legacy-id");
});
