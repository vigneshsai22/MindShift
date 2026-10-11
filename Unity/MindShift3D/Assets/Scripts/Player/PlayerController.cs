// ═══════════════════════════════════════════════════════════════
// MindShift 3D — PlayerController
// WASD movement + mouse-look first-person controller.
// Handles interaction raycasting (calls InteractionSystem).
// ═══════════════════════════════════════════════════════════════
using UnityEngine;
using MindShift.Interaction;

namespace MindShift.Player
{
    [RequireComponent(typeof(CharacterController))]
    public class PlayerController : MonoBehaviour
    {
        // ── Inspector ─────────────────────────────────────────────
        [Header("Movement")]
        public float walkSpeed  = 4f;
        public float sprintSpeed = 7f;
        public float gravity    = -9.81f;

        [Header("Mouse Look")]
        public float mouseSensitivity = 2f;
        public float maxLookUp   = 80f;
        public float maxLookDown = -80f;

        [Header("Interaction")]
        public float interactRange = 3.5f;
        public LayerMask interactableMask;

        [Header("References")]
        public Camera playerCamera;

        // ── Private ───────────────────────────────────────────────
        private CharacterController _cc;
        private Vector3             _velocity;
        private float               _cameraPitch = 0f;
        private bool                _locked      = false;   // set true during challenges

        private IInteractable _currentTarget;

        // ─────────────────────────────────────────────────────────
        private void Awake()
        {
            _cc = GetComponent<CharacterController>();
            if (playerCamera == null)
                playerCamera = Camera.main;
        }

        private void Start()
        {
            LockCursor(true);
        }

        private void Update()
        {
            if (_locked) return;

            HandleMovement();
            HandleMouseLook();
            HandleInteractionRaycast();

            if (Input.GetKeyDown(KeyCode.E))
                TryInteract();

            if (Input.GetKeyDown(KeyCode.Escape))
                MindShift.Core.GameManager.Instance.PauseGame();
        }

        // ── Movement ──────────────────────────────────────────────
        private void HandleMovement()
        {
            float h = Input.GetAxis("Horizontal");
            float v = Input.GetAxis("Vertical");
            bool  sprinting = Input.GetKey(KeyCode.LeftShift);

            float speed = sprinting ? sprintSpeed : walkSpeed;
            Vector3 move = transform.right * h + transform.forward * v;
            _cc.Move(move * speed * Time.deltaTime);

            // Gravity
            if (_cc.isGrounded && _velocity.y < 0f)
                _velocity.y = -2f;

            _velocity.y += gravity * Time.deltaTime;
            _cc.Move(_velocity * Time.deltaTime);
        }

        // ── Mouse Look ────────────────────────────────────────────
        private void HandleMouseLook()
        {
            float mouseX = Input.GetAxis("Mouse X") * mouseSensitivity;
            float mouseY = Input.GetAxis("Mouse Y") * mouseSensitivity;

            _cameraPitch -= mouseY;
            _cameraPitch  = Mathf.Clamp(_cameraPitch, maxLookDown, maxLookUp);

            playerCamera.transform.localRotation = Quaternion.Euler(_cameraPitch, 0f, 0f);
            transform.Rotate(Vector3.up * mouseX);
        }

        // ── Interaction Raycast ───────────────────────────────────
        private void HandleInteractionRaycast()
        {
            Ray ray = new Ray(playerCamera.transform.position, playerCamera.transform.forward);

            if (Physics.Raycast(ray, out RaycastHit hit, interactRange, interactableMask))
            {
                IInteractable interactable = hit.collider.GetComponentInParent<IInteractable>();
                if (interactable != null)
                {
                    if (interactable != _currentTarget)
                    {
                        _currentTarget?.OnHoverExit();
                        _currentTarget = interactable;
                        _currentTarget.OnHoverEnter();
                        InteractionSystem.Instance?.SetPrompt(interactable.InteractPrompt);
                    }
                    return;
                }
            }

            // Nothing hit
            if (_currentTarget != null)
            {
                _currentTarget.OnHoverExit();
                _currentTarget = null;
                InteractionSystem.Instance?.ClearPrompt();
            }
        }

        private void TryInteract()
        {
            _currentTarget?.OnInteract(gameObject);
        }

        // ── Locking (for challenge UI) ────────────────────────────
        public void LockMovement(bool locked)
        {
            _locked = locked;
            LockCursor(!locked);
        }

        private void LockCursor(bool lockIt)
        {
            Cursor.lockState = lockIt ? CursorLockMode.Locked : CursorLockMode.None;
            Cursor.visible   = !lockIt;
        }
    }
}
