// ═══════════════════════════════════════════════════════════════
// MindShift 3D — DoorController
// Controls sliding laboratory blast doors in the Lobby hub.
// Supports lock/unlock states, smooth sliding animation,
// status indicator light transitions, and scene transition triggers.
// ═══════════════════════════════════════════════════════════════
using System.Collections;
using UnityEngine;
using MindShift.Audio;
using MindShift.Challenges;
using MindShift.Core;
using MindShift.Interaction;

namespace MindShift.Environment
{
    public class DoorController : MonoBehaviour, IInteractable
    {
        // ── Inspector References ──────────────────────────────────
        [Header("Door Geometry")]
        public Transform leftDoorLeaf;
        public Transform rightDoorLeaf;
        public Vector3   leftOpenOffset  = new Vector3(-1.8f, 0, 0);
        public Vector3   rightOpenOffset = new Vector3(1.8f, 0, 0);
        public float     slideDuration   = 1.2f;

        [Header("Lab Configuration")]
        public ChallengeType targetChallengeType = ChallengeType.MemoryObjectRecall;
        public string        targetSceneName     = "Lab_Memory";
        public bool          isLocked            = false;

        [Header("Status Light")]
        public Renderer statusIndicatorRenderer;
        public Color    unlockedColor = new Color(0f, 1f, 0.4f);
        public Color    lockedColor   = new Color(1f, 0.2f, 0.2f);

        // ── Private State ─────────────────────────────────────────
        private Vector3 _leftClosedPos;
        private Vector3 _rightClosedPos;
        private bool    _isOpen   = false;
        private bool    _isMoving = false;

        // ── IInteractable Implementation ──────────────────────────
        public string InteractPrompt => isLocked 
            ? "Door Locked (Complete previous lab)" 
            : (_isOpen ? "[E] Enter Lab" : "[E] Open Blast Door");

        public void OnHoverEnter()
        {
            if (statusIndicatorRenderer != null)
                statusIndicatorRenderer.transform.localScale = Vector3.one * 1.15f;
        }

        public void OnHoverExit()
        {
            if (statusIndicatorRenderer != null)
                statusIndicatorRenderer.transform.localScale = Vector3.one;
        }

        public void OnInteract(GameObject interactor)
        {
            if (isLocked)
            {
                AudioManager.Instance?.PlaySFX(SFXType.Wrong);
                return;
            }

            if (!_isOpen)
            {
                OpenDoor();
            }
            else
            {
                EnterLab();
            }
        }

        // ── Lifecycle ─────────────────────────────────────────────
        private void Awake()
        {
            if (leftDoorLeaf != null)  _leftClosedPos  = leftDoorLeaf.localPosition;
            if (rightDoorLeaf != null) _rightClosedPos = rightDoorLeaf.localPosition;

            UpdateStatusLight();
        }

        public void SetLocked(bool locked)
        {
            isLocked = locked;
            UpdateStatusLight();
        }

        private void UpdateStatusLight()
        {
            if (statusIndicatorRenderer != null)
            {
                Material mat = statusIndicatorRenderer.material;
                Color col = isLocked ? lockedColor : unlockedColor;
                mat.color = col;
                mat.SetColor("_EmissionColor", col * 1.5f);
            }
        }

        public void OpenDoor()
        {
            if (_isOpen || _isMoving) return;
            StartCoroutine(SlideRoutine(true));
        }

        public void CloseDoor()
        {
            if (!_isOpen || _isMoving) return;
            StartCoroutine(SlideRoutine(false));
        }

        public void EnterLab()
        {
            Debug.Log($"[Door] Entering {targetSceneName} for {targetChallengeType}");
            ChallengeManager.Instance?.SetPendingChallenge(targetChallengeType);
            SceneLoader.Instance?.LoadScene(targetSceneName);
        }

        private IEnumerator SlideRoutine(bool open)
        {
            _isMoving = true;
            AudioManager.Instance?.PlaySFX(open ? SFXType.DoorOpen : SFXType.DoorClose);

            Vector3 startLeft  = leftDoorLeaf != null ? leftDoorLeaf.localPosition : Vector3.zero;
            Vector3 startRight = rightDoorLeaf != null ? rightDoorLeaf.localPosition : Vector3.zero;

            Vector3 destLeft  = open ? (_leftClosedPos + leftOpenOffset) : _leftClosedPos;
            Vector3 destRight = open ? (_rightClosedPos + rightOpenOffset) : _rightClosedPos;

            float elapsed = 0f;
            while (elapsed < slideDuration)
            {
                elapsed += Time.deltaTime;
                float t = Mathf.SmoothStep(0f, 1f, elapsed / slideDuration);

                if (leftDoorLeaf != null)
                    leftDoorLeaf.localPosition = Vector3.Lerp(startLeft, destLeft, t);

                if (rightDoorLeaf != null)
                    rightDoorLeaf.localPosition = Vector3.Lerp(startRight, destRight, t);

                yield return null;
            }

            _isOpen = open;
            _isMoving = false;
        }

        // ── Auto-Open on Trigger ──────────────────────────────────
        private void OnTriggerEnter(Collider other)
        {
            if (other.CompareTag("Player") && !isLocked && !_isOpen)
            {
                OpenDoor();
            }
        }

        private void OnTriggerExit(Collider other)
        {
            if (other.CompareTag("Player") && _isOpen)
            {
                CloseDoor();
            }
        }
    }
}
