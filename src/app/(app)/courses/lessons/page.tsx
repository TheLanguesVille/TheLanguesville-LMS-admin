"use client";

import { roleLabel } from "@/lib/api/auth";
import {
  AspectRatio,
  Box,
  Button,
  Flex,
  HStack,
  Heading,
  IconButton,
  Portal,
  Skeleton,
  Stack,
  Text,
} from "@chakra-ui/react";
import { AlertTriangle, ArrowLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useAdmin } from "@/lib/hooks/use-admin";
import { coursePaths } from "@/lib/routes";
import {
  type ApiCourse,
  type ApiLessonDetail,
  type ApiModuleDetail,
  type ApiContentBlock,
  getCourse,
  deleteApiLesson,
} from "@/lib/api/courses";

function toEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) {
      return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    if (u.hostname.includes("vimeo.com")) {
      return `https://player.vimeo.com/video${u.pathname}`;
    }
  } catch {
    // not a valid URL, return as-is
  }
  return url;
}

function ContentBlockCard({ block }: { block: ApiContentBlock }) {
  if (block.type === "text") {
    return (
      <Box
        bg="white"
        borderWidth="1px"
        borderColor="gray.200"
        rounded="xl"
        p={5}
      >
        {block.title && (
          <Text fontWeight="semibold" fontSize="md" color="gray.900" mb={2}>
            {block.title}
          </Text>
        )}
        <Box
          fontSize="sm"
          color="gray.600"
          lineHeight="1.7"
          dangerouslySetInnerHTML={{ __html: block.content ?? "" }}
          css={{
            "& ul": { paddingLeft: "20px", listStyle: "disc" },
            "& ol": { paddingLeft: "20px", listStyle: "decimal" },
            "& h1": { fontSize: "20px", fontWeight: 700, margin: "0.5em 0" },
            "& h2": { fontSize: "17px", fontWeight: 700, margin: "0.5em 0" },
            "& h3": { fontSize: "15px", fontWeight: 700, margin: "0.5em 0" },
            "& a": { color: "#2E2F6F", textDecoration: "underline" },
            "& li": { marginBottom: "4px" },
          }}
        />
      </Box>
    );
  }

  if (block.type === "video" && block.url) {
    return (
      <Box
        bg="white"
        borderWidth="1px"
        borderColor="gray.200"
        rounded="xl"
        overflow="hidden"
      >
        {block.title && (
          <Box px={5} pt={4} pb={2}>
            <Text fontWeight="semibold" fontSize="md" color="gray.900">
              {block.title}
            </Text>
          </Box>
        )}
        <Box px={5} pb={5}>
          <AspectRatio ratio={16 / 9} rounded="md" overflow="hidden" bg="black">
            <iframe
              src={toEmbedUrl(block.url ?? "")}
              title={block.title ?? "Video"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ border: 0 }}
            />
          </AspectRatio>
        </Box>
      </Box>
    );
  }

  if (block.type === "file") {
    const mime = block.mimeType ?? "";
    const isImage = mime.startsWith("image/");
    const isPdf = mime === "application/pdf";
    return (
      <Box
        bg="white"
        borderWidth="1px"
        borderColor="gray.200"
        rounded="xl"
        p={5}
      >
        {block.title && (
          <Text fontWeight="semibold" fontSize="md" color="gray.900" mb={2}>
            {block.title}
          </Text>
        )}

        {block.fileUrl && isImage ? (
          <Box
            rounded="md"
            borderWidth="1px"
            borderColor="gray.200"
            overflow="hidden"
            mb={3}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={block.fileUrl}
              alt={block.fileName ?? "Attachment"}
              style={{ width: "100%", display: "block" }}
            />
          </Box>
        ) : block.fileUrl && isPdf ? (
          <Box
            rounded="md"
            borderWidth="1px"
            borderColor="gray.200"
            overflow="hidden"
            mb={3}
          >
            <iframe
              src={block.fileUrl}
              title={block.fileName ?? "PDF preview"}
              style={{ width: "100%", height: 480, border: 0, display: "block" }}
            />
          </Box>
        ) : null}

        <HStack gap={3} mt={1}>
          <a
            href={block.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 14,
              color: "#2E2F6F",
              fontWeight: 500,
              textDecoration: "underline",
            }}
          >
            {block.fileName ?? "Download file"}
          </a>
        </HStack>
      </Box>
    );
  }

  return null;
}

function TableOfContents({ blocks }: { blocks: ApiContentBlock[] }) {
  const textBlocks = blocks.filter((b) => b.type === "text" && b.title);

  return (
    <Box
      bg="white"
      borderWidth="1px"
      borderColor="gray.200"
      rounded="xl"
      p={5}
      position="sticky"
      top="88px"
    >
      <Text fontWeight="semibold" fontSize="md" color="gray.900" mb={4}>
        Table of Content
      </Text>
      <Stack gap={3}>
        {textBlocks.map((b, i) => (
          <HStack key={b._id} gap={3} align="flex-start">
            <Text
              fontSize="sm"
              color={i === 0 ? "#F97461" : "gray.400"}
              fontWeight="semibold"
              minW="20px"
            >
              {String(i + 1).padStart(2, "0")}
            </Text>
            <Text
              fontSize="sm"
              color={i === 0 ? "#F97461" : "gray.700"}
              fontWeight={i === 0 ? "medium" : "normal"}
            >
              {b.title}
            </Text>
          </HStack>
        ))}
      </Stack>
    </Box>
  );
}

function LessonDetailContent() {
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId") ?? "";
  const lessonId = searchParams.get("lessonId") ?? "";
  const router = useRouter();
  const { admin, loading: adminLoading } = useAdmin();
  const [course, setCourse] = useState<ApiCourse | null>(null);
  const [mod, setMod] = useState<ApiModuleDetail | null>(null);
  const [lesson, setLesson] = useState<ApiLessonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (!courseId || !lessonId) {
      router.replace(coursePaths.list);
      return;
    }
    async function load() {
      setLoading(true);
      const result = await getCourse(courseId);
      if (result.success) {
        setCourse(result.data);
        for (const m of result.data.modules) {
          const found = m.lessons.find((l) => l._id === lessonId);
          if (found) {
            setMod(m);
            setLesson(found);
            break;
          }
        }
      } else {
        toast.error(result.message || "Failed to load course");
        router.push(coursePaths.list);
      }
      setLoading(false);
    }
    void load();
  }, [courseId, lessonId, router]);

  const handleConfirmDelete = async () => {
    if (!mod) return;
    setShowDeleteModal(false);
    setActionLoading(true);
    const result = await deleteApiLesson(courseId, mod._id, lessonId);
    if (result.success) {
      toast.success("Lesson deleted");
      router.push(coursePaths.details(courseId));
    } else {
      toast.error(result.message || "Failed to delete lesson");
      setActionLoading(false);
    }
  };

  return (
    <Box>
      <DashboardHeader
        title="Courses"
        loading={adminLoading}
        user={
          admin
            ? {
                name: `${admin.firstName} ${admin.lastName}`.trim(),
                role: roleLabel(admin.role),
              }
            : undefined
        }
      />

      <Box px={8} py={6}>
        {/* Back + actions row */}
        <Flex align="center" justify="space-between" mb={4}>
          <IconButton
            aria-label="Back"
            variant="ghost"
            size="sm"
            onClick={() => router.push(coursePaths.details(courseId))}
          >
            <ArrowLeft size={18} />
          </IconButton>

          {!loading && (
            <HStack gap={2}>
              <Button
                variant="ghost"
                color="#DC2626"
                fontWeight="semibold"
                fontSize="sm"
                h="36px"
                px={4}
                _hover={{ bg: "red.50" }}
                loading={actionLoading}
                onClick={() => setShowDeleteModal(true)}
              >
                Delete
              </Button>
              <Button
                variant="outline"
                fontWeight="semibold"
                fontSize="sm"
                h="36px"
                px={4}
                rounded="md"
                onClick={() =>
                  router.push(
                    coursePaths.edit(courseId, {
                      moduleId: mod?._id,
                      lessonId,
                    }),
                  )
                }
              >
                Edit
              </Button>
              <Button
                bg="#2E2F6F"
                color="white"
                fontWeight="semibold"
                fontSize="sm"
                h="36px"
                px={4}
                rounded="md"
                _hover={{ bg: "#262760" }}
                loading={actionLoading}
                onClick={() => router.push(coursePaths.details(courseId))}
              >
                Archive
              </Button>
            </HStack>
          )}
        </Flex>

        {/* Breadcrumb */}
        {loading ? (
          <Skeleton height="14px" width="340px" rounded="md" mb={4} />
        ) : (
          <HStack gap={2} mb={4} fontSize="sm" flexWrap="wrap">
            <Text
              color="#2E2F6F"
              fontWeight="medium"
              cursor="pointer"
              onClick={() => router.push(coursePaths.details(courseId))}
              _hover={{ textDecoration: "underline" }}
            >
              {course?.title}
            </Text>
            <ChevronRight size={14} color="#9CA3AF" />
            <Text color="gray.700" fontWeight="medium">
              {mod?.title} / {lesson?.title}
            </Text>
          </HStack>
        )}

        {/* Lesson title */}
        {loading ? (
          <Skeleton height="32px" width="260px" rounded="md" mb={6} />
        ) : (
          <Heading as="h2" size="lg" color="gray.900" mb={6}>
            {lesson?.title}
          </Heading>
        )}

        {/* Content + TOC */}
        <Flex gap={5} align="flex-start">
          {/* Blocks */}
          <Stack flex="1" gap={4} minW={0}>
            {loading
              ? [...Array(3)].map((_, i) => (
                  <Box
                    key={i}
                    bg="white"
                    borderWidth="1px"
                    borderColor="gray.200"
                    rounded="xl"
                    p={5}
                  >
                    <Skeleton height="18px" width="30%" rounded="md" mb={3} />
                    <Skeleton height="13px" width="100%" rounded="md" mb={2} />
                    <Skeleton height="13px" width="90%" rounded="md" mb={2} />
                    <Skeleton height="13px" width="75%" rounded="md" />
                  </Box>
                ))
              : lesson?.contentBlocks
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((block) => (
                    <ContentBlockCard key={block._id} block={block} />
                  ))}
          </Stack>

          {/* Table of contents */}
          <Box w="280px" flexShrink={0}>
            {loading ? (
              <Box
                bg="white"
                borderWidth="1px"
                borderColor="gray.200"
                rounded="xl"
                p={5}
              >
                <Skeleton height="18px" width="160px" rounded="md" mb={4} />
                {[...Array(3)].map((_, i) => (
                  <Skeleton
                    key={i}
                    height="13px"
                    width="120px"
                    rounded="md"
                    mb={3}
                  />
                ))}
              </Box>
            ) : (
              <TableOfContents blocks={lesson?.contentBlocks ?? []} />
            )}
          </Box>
        </Flex>
      </Box>

      {/* Delete lesson confirmation modal */}
      {showDeleteModal && (
        <Portal>
          <Box
            position="fixed"
            inset={0}
            bg="blackAlpha.600"
            zIndex={200}
            display="flex"
            alignItems="center"
            justifyContent="center"
            px={4}
            onClick={() => setShowDeleteModal(false)}
          >
            <Box
              bg="white"
              rounded="2xl"
              p={8}
              w="full"
              maxW="440px"
              boxShadow="2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Stack gap={5} align="center" textAlign="center">
                <Box
                  w="56px"
                  h="56px"
                  rounded="full"
                  bg="#FEE2E2"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <AlertTriangle size={26} color="#DC2626" />
                </Box>
                <Stack gap={2}>
                  <Heading as="h3" size="md" color="gray.900">
                    Delete Lesson?
                  </Heading>
                  <Text fontSize="sm" color="gray.500" lineHeight="1.6">
                    Are you sure you want to delete{" "}
                    <strong>{lesson?.title}</strong>? This action cannot be
                    undone.
                  </Text>
                </Stack>
                <Stack gap={3} w="full">
                  <Button
                    bg="#DC2626"
                    color="white"
                    rounded="full"
                    h="48px"
                    fontSize="sm"
                    fontWeight="semibold"
                    w="full"
                    _hover={{ bg: "#B91C1C" }}
                    loading={actionLoading}
                    onClick={handleConfirmDelete}
                  >
                    Delete Lesson
                  </Button>
                  <Button
                    variant="outline"
                    rounded="full"
                    h="48px"
                    fontSize="sm"
                    fontWeight="medium"
                    w="full"
                    onClick={() => setShowDeleteModal(false)}
                  >
                    Cancel
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Box>
        </Portal>
      )}
    </Box>
  );
}

export default function LessonDetailPage() {
  return (
    <Suspense>
      <LessonDetailContent />
    </Suspense>
  );
}
