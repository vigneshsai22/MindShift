// ═══════════════════════════════════════════════════════════════
// MindShift 3D — RadarChart
// Custom Unity UI Graphic that draws a 6-axis cognitive spider /
// radar chart using procedural mesh generation (VertexHelper).
// Visualizes: Memory, Observation, Logic, Reaction, Spatial, Audio.
// ═══════════════════════════════════════════════════════════════
using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using MindShift.Challenges;

namespace MindShift.UI
{
    [RequireComponent(typeof(CanvasRenderer))]
    public class RadarChart : MaskableGraphic
    {
        // ── Settings ──────────────────────────────────────────────
        [Header("Chart Geometry")]
        [Range(3, 8)] public int axesCount = 6;
        public float chartRadius = 130f;
        public int   gridRings   = 4;

        [Header("Aesthetics")]
        public Color dataFillColor   = new Color(0f, 0.9f, 1f, 0.35f);
        public Color dataLineColor   = new Color(0f, 1f, 0.8f, 0.95f);
        public float dataLineWidth   = 3f;
        public Color gridLineColor   = new Color(1f, 1f, 1f, 0.15f);
        public float gridLineWidth   = 1.5f;
        public Color axisLineColor   = new Color(1f, 1f, 1f, 0.25f);
        public float axisLineWidth   = 1.5f;

        [Header("Labels (Optional References)")]
        public List<Text> categoryLabels;

        // Normalized values [0..1] per axis
        private float[] _values = new float[] { 0.75f, 0.80f, 0.65f, 0.85f, 0.70f, 0.60f };

        // ── Public API ────────────────────────────────────────────
        public void SetValues(float[] values)
        {
            if (values == null || values.Length == 0) return;

            axesCount = values.Length;
            _values = new float[axesCount];
            for (int i = 0; i < axesCount; i++)
            {
                _values[i] = Mathf.Clamp01(values[i]);
            }

            SetVerticesDirty();
        }

        public void SetValuesFromDictionary(Dictionary<CognitiveCategory, float> dict)
        {
            if (dict == null) return;

            // Ordered categories
            CognitiveCategory[] order = new[]
            {
                CognitiveCategory.Memory,
                CognitiveCategory.Observation,
                CognitiveCategory.Logic,
                CognitiveCategory.Reaction,
                CognitiveCategory.Spatial,
                CognitiveCategory.Audio
            };

            float[] vals = new float[order.Length];
            for (int i = 0; i < order.Length; i++)
            {
                vals[i] = dict.TryGetValue(order[i], out float v) ? Mathf.Clamp01(v) : 0.5f;
            }

            SetValues(vals);
        }

        // ── Mesh Generation ───────────────────────────────────────
        protected override void OnPopulateMesh(VertexHelper vh)
        {
            vh.Clear();

            if (axesCount < 3) return;

            Vector2 center = Vector2.zero;

            // 1. Draw concentric grid polygons
            for (int ring = 1; ring <= gridRings; ring++)
            {
                float ringRadius = chartRadius * (ring / (float)gridRings);
                DrawPolygonOutline(vh, center, ringRadius, axesCount, gridLineColor, gridLineWidth);
            }

            // 2. Draw radiating axis lines
            for (int i = 0; i < axesCount; i++)
            {
                float angle = GetAxisAngle(i);
                Vector2 spokeEnd = center + new Vector2(Mathf.Cos(angle), Mathf.Sin(angle)) * chartRadius;
                DrawLine(vh, center, spokeEnd, axisLineColor, axisLineWidth);
            }

            // 3. Draw data filled polygon
            int centerIdx = vh.currentVertCount;
            UIVertex cVert = UIVertex.simpleVert;
            cVert.position = center;
            cVert.color = dataFillColor;
            vh.AddVert(cVert);

            Vector2[] dataPoints = new Vector2[axesCount];
            for (int i = 0; i < axesCount; i++)
            {
                float angle = GetAxisAngle(i);
                float val = (_values != null && i < _values.Length) ? _values[i] : 0.5f;
                float r = chartRadius * val;
                dataPoints[i] = center + new Vector2(Mathf.Cos(angle), Mathf.Sin(angle)) * r;

                UIVertex dVert = UIVertex.simpleVert;
                dVert.position = dataPoints[i];
                dVert.color = dataFillColor;
                vh.AddVert(dVert);
            }

            for (int i = 0; i < axesCount; i++)
            {
                int next = (i + 1) % axesCount;
                vh.AddTriangle(centerIdx, centerIdx + 1 + i, centerIdx + 1 + next);
            }

            // 4. Draw data outline border
            for (int i = 0; i < axesCount; i++)
            {
                int next = (i + 1) % axesCount;
                DrawLine(vh, dataPoints[i], dataPoints[next], dataLineColor, dataLineWidth);
            }
        }

        private float GetAxisAngle(int index)
        {
            // Start from 90 degrees (top) and go clockwise
            float step = 2f * Mathf.PI / axesCount;
            return (Mathf.PI * 0.5f) - (index * step);
        }

        private void DrawLine(VertexHelper vh, Vector2 from, Vector2 to, Color col, float width)
        {
            Vector2 dir = (to - from).normalized;
            Vector2 normal = new Vector2(-dir.y, dir.x) * (width * 0.5f);

            int startIdx = vh.currentVertCount;

            UIVertex v1 = UIVertex.simpleVert; v1.position = from - normal; v1.color = col;
            UIVertex v2 = UIVertex.simpleVert; v2.position = from + normal; v2.color = col;
            UIVertex v3 = UIVertex.simpleVert; v3.position = to + normal;   v3.color = col;
            UIVertex v4 = UIVertex.simpleVert; v4.position = to - normal;   v4.color = col;

            vh.AddVert(v1);
            vh.AddVert(v2);
            vh.AddVert(v3);
            vh.AddVert(v4);

            vh.AddTriangle(startIdx, startIdx + 1, startIdx + 2);
            vh.AddTriangle(startIdx + 2, startIdx + 3, startIdx);
        }

        private void DrawPolygonOutline(VertexHelper vh, Vector2 center, float radius, int sides, Color col, float width)
        {
            for (int i = 0; i < sides; i++)
            {
                float a1 = GetAxisAngle(i);
                float a2 = GetAxisAngle((i + 1) % sides);

                Vector2 p1 = center + new Vector2(Mathf.Cos(a1), Mathf.Sin(a1)) * radius;
                Vector2 p2 = center + new Vector2(Mathf.Cos(a2), Mathf.Sin(a2)) * radius;

                DrawLine(vh, p1, p2, col, width);
            }
        }
    }
}
