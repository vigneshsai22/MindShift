// ═══════════════════════════════════════════════════════════════
// MindShift 3D — LineChart
// Procedural line chart displaying session-by-session performance trends.
// ═══════════════════════════════════════════════════════════════
using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace MindShift.UI
{
    [RequireComponent(typeof(CanvasRenderer))]
    public class LineChart : MaskableGraphic
    {
        [Header("Chart Size")]
        public float chartWidth  = 340f;
        public float chartHeight = 160f;
        public float lineWidth   = 3f;
        public float pointRadius = 4.5f;

        [Header("Colors")]
        public Color lineColor   = new Color(0f, 1f, 0.65f, 1f);
        public Color pointColor  = new Color(1f, 1f, 1f, 1f);
        public Color gridColor   = new Color(1f, 1f, 1f, 0.15f);
        public Color areaColor   = new Color(0f, 1f, 0.65f, 0.18f);

        private float[] _dataPoints = new float[] { 0.45f, 0.60f, 0.55f, 0.72f, 0.85f, 0.90f };

        public void SetPoints(float[] points)
        {
            if (points == null || points.Length == 0) return;
            _dataPoints = new float[points.Length];
            for (int i = 0; i < points.Length; i++)
            {
                _dataPoints[i] = Mathf.Clamp01(points[i]);
            }
            SetVerticesDirty();
        }

        protected override void OnPopulateMesh(VertexHelper vh)
        {
            vh.Clear();

            int count = _dataPoints != null ? _dataPoints.Length : 0;
            if (count < 2) return;

            Vector2 origin = new Vector2(-chartWidth * 0.5f, -chartHeight * 0.5f);

            // Background grid lines (3 horizontal guides)
            for (int g = 0; g <= 3; g++)
            {
                float gy = origin.y + (chartHeight * (g / 3f));
                DrawLine(vh, new Vector2(origin.x, gy), new Vector2(origin.x + chartWidth, gy), gridColor, 1f);
            }

            Vector2[] points = new Vector2[count];
            float stepX = chartWidth / (count - 1);

            for (int i = 0; i < count; i++)
            {
                float x = origin.x + (i * stepX);
                float y = origin.y + (_dataPoints[i] * chartHeight);
                points[i] = new Vector2(x, y);
            }

            // Draw filled area underneath line
            for (int i = 0; i < count - 1; i++)
            {
                Vector2 b1 = new Vector2(points[i].x, origin.y);
                Vector2 b2 = new Vector2(points[i + 1].x, origin.y);
                DrawQuad(vh, b1, b2, points[i + 1], points[i], areaColor);
            }

            // Draw connecting lines
            for (int i = 0; i < count - 1; i++)
            {
                DrawLine(vh, points[i], points[i + 1], lineColor, lineWidth);
            }

            // Draw point markers (small diamond / quad)
            for (int i = 0; i < count; i++)
            {
                DrawPointMarker(vh, points[i], pointRadius, pointColor);
            }
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

        private void DrawQuad(VertexHelper vh, Vector2 bl, Vector2 br, Vector2 tr, Vector2 tl, Color c)
        {
            int startIdx = vh.currentVertCount;

            UIVertex v1 = UIVertex.simpleVert; v1.position = bl; v1.color = c;
            UIVertex v2 = UIVertex.simpleVert; v2.position = br; v2.color = c;
            UIVertex v3 = UIVertex.simpleVert; v3.position = tr; v3.color = c;
            UIVertex v4 = UIVertex.simpleVert; v4.position = tl; v4.color = c;

            vh.AddVert(v1);
            vh.AddVert(v2);
            vh.AddVert(v3);
            vh.AddVert(v4);

            vh.AddTriangle(startIdx, startIdx + 1, startIdx + 2);
            vh.AddTriangle(startIdx + 2, startIdx + 3, startIdx);
        }

        private void DrawPointMarker(VertexHelper vh, Vector2 center, float radius, Color c)
        {
            int startIdx = vh.currentVertCount;

            UIVertex v1 = UIVertex.simpleVert; v1.position = center + new Vector2(-radius, 0); v1.color = c;
            UIVertex v2 = UIVertex.simpleVert; v2.position = center + new Vector2(0, radius);  v2.color = c;
            UIVertex v3 = UIVertex.simpleVert; v3.position = center + new Vector2(radius, 0);  v3.color = c;
            UIVertex v4 = UIVertex.simpleVert; v4.position = center + new Vector2(0, -radius); v4.color = c;

            vh.AddVert(v1);
            vh.AddVert(v2);
            vh.AddVert(v3);
            vh.AddVert(v4);

            vh.AddTriangle(startIdx, startIdx + 1, startIdx + 2);
            vh.AddTriangle(startIdx, startIdx + 2, startIdx + 3);
        }
    }
}
